import express from "express";
import bodyParser from "body-parser";
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import * as data from './data.js';


const app = express();
const port = 3000;
const SALT_WORK_FACTOR = 10;
const MILLISECONDS_IN_MONTH = 2592000000;

//user
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: [4, 'Password must be at least 8 characters long'],
        maxlength: [128, 'Password must be less than 128 characters long']
    }
});
userSchema.pre('save', function (next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err) return next(err);


        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) return next(err);
            user.password = hash;
            next();
        });
    });
});
userSchema.methods.comparePassword = async function (candidatePassword) {
    var res = await bcrypt.compare(candidatePassword, this.password);
    return res;
};
const User = mongoose.model("User", userSchema);

//financial details
const financialSchema = new mongoose.Schema({
    user: {
        type: userSchema,
        required: true,

    },
    income: {
        type: Number,
        required: true,
    },
    regularPayments: []

});
const Financial = mongoose.model("Financial", financialSchema);


function itemSchema(title, content, type) {
    this.title = title;
    this.content = content;
    this.type = type;
};


//regularpaymentes item
const paymentsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    }
});
const Payment = mongoose.model("payment", paymentsSchema);

//occasional payments
const occasionalSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    }
});
const Occasional = mongoose.model("occasional", occasionalSchema);

//user occasional payments
const useroccasionalSchema = new mongoose.Schema({
    user: {
        type: userSchema,
        required: true,

    },
    occasionalPayments: []

});
const UserOccasional = mongoose.model("user-occasional", useroccasionalSchema);


app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));
mongoose.connect(data.path(), {
    useNewUrlParser: true
});



app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});


app.get("/", (req, res) => {

    if (req.body.username == undefined || req.body.username == 'null' || req.body.username == '') {
        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        res.render("./index.ejs", {
            currentUrl: fullUrl
        });
    } else {
        res.render("./index.ejs", {
            currentUrl: fullUrl
        });
    }
});


app.get("/signup", (req, res) => {

    res.render("./signup.ejs");
});

app.post("/signup", async (req, res) => {
    var userName = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    var income = req.body.income;
    var mounthlySavings = req.body.mounthlySavings;



    var user = new User({
        username: userName,
        email: email,
        password: password
    });

    try {
        await user.save();
    } catch (err) {
        errOcurred(err, res, req);
    }

    var financial = new Financial({
        user: user,
        income: income,



    });
    var userOccasional = new UserOccasional({
        user: user,
    });
    try {
        if (mounthlySavings != null && mounthlySavings != undefined && mounthlySavings != '') {
            var mounthlySavingsPayment = new Payment({
                title: 'mounthly savings',
                amount: mounthlySavings,
                type: 'savings'
            });
            financial.regularPayments.push(mounthlySavingsPayment);
        }
        await financial.save();
        await userOccasional.save();
        console.log(userName + " was added succesfully");
    } catch (err) {

        errOcurred(err, res, req);
    }
    var items = itemCreation(financial);
    var occasionalItems = occasionalCreation(userOccasional, items);
    res.render("./index.ejs", {
        name: userName,
        items: items,
        id: user._id,
        occasional: occasionalItems
    });
});
app.post('/login', async (req, res) => {
    var email = req.body.email;
    var password = req.body.password;
    var usr;
    var isMatch = false;
    usr = await User.findOne({
        email: {
            $eq: email
        }
    }).
    catch((err) => {
        errOcurred(err, res, req);
    });


    try {
        isMatch = await usr.comparePassword(password);
    } catch (err) {

        errOcurred(err, res, req);
    }
    if (!isMatch) {
        errOcurred('there is a typo', res, req);
    } else {
        var usrOccasional = await UserOccasional.findOne({
            'user._id': usr._id
        });
        var usrFincaial = await Financial.findOne({
            'user._id': usr._id
        });
        var result = initFeed(usrFincaial, usrOccasional);
        var items = result[0];
        var occasionalItems = result[1];
        res.render("./index.ejs", {
            name: usr.username,
            items: items,
            id: usr._id,
            occasional: occasionalItems
        });
    }

});
app.post('/regularpayment/:USERID', async (req, res) => {
    var id = req.params.USERID;
    var usrFincaial = await Financial.findOne({
        'user._id': id
    });
    var usrOccasional = await UserOccasional.findOne({
        'user._id': id
    });
    usrFincaial.regularPayments.push(new Payment({
        title: req.body.title,
        type: req.body.type,
        amount: req.body.amount
    }));
    try {
        usrFincaial.save();
        var result = initFeed(usrFincaial, usrOccasional);
        var items = result[0];
        var occasionalItems = result[1];
        res.render("./index.ejs", {
            name: usrFincaial.user.username,
            items: items,
            id: id,
            occasional: occasionalItems
        });
    } catch (err) {
        errOcurred(err, res, req);
    }

});
app.post('/occasionalpayments/:USERID', async (req, res) => {
    var id = req.params.USERID;
    var usrOccasional = await UserOccasional.findOne({
        'user._id': id
    });
    var usrFincaial = await Financial.findOne({
        'user._id': id
    });
    usrOccasional.occasionalPayments.push(new Occasional({
        title: req.body.title,
        amount: req.body.amount,
        date: new Date()
    }));
    try {
        usrOccasional.save();
        var result = initFeed(usrFincaial, usrOccasional);
        var items = result[0];
        var occasionalItems = result[1];
        res.render("./index.ejs", {
            name: usrFincaial.user.username,
            items: items,
            id: id,
            occasional: occasionalItems
        });
    } catch (err) {
        errOcurred(err, res, req);
    }

});

function errOcurred(err, res, req) {
    console.log(err);
    var fullUrl = req.protocol + '://' + req.get('host');
    res.render("./errorHandler.ejs", {
        currentUrl: fullUrl,
        err: err
    });
}

function itemCreation(usrFincaial) {

    var items = [];
    var payments = []
    var paymentsSum = 0;
    items.push(new itemSchema("Your income is:",
        usrFincaial.income,
        "income"
    ));
    var usrRegularregularPayments = usrFincaial.regularPayments;
    usrRegularregularPayments.forEach((payment) => {
        paymentsSum += payment.amount;
        var temp = new itemSchema(payment.title,
            "your paying for that :" + payment.amount + " a mounth",
            payment.type.toString()
        );
        payments.push(temp);
    });

    items.push(new itemSchema("After regular payments",
        usrFincaial.income - paymentsSum + " left",
        "left"
    ));

    items = items.concat(payments);
    return items;
}

function occasionalCreation(usrOccasional) {
    var items = [];

    var paymentsSum = 0;
    var usrOccasionalPayments = usrOccasional.occasionalPayments;
    usrOccasionalPayments.forEach((payment) => {
        if (Math.abs(new Date() - payment.data) < MILESECONDS_IN_MOUNTH)
            paymentsSum += payment.amount;
        items.push(payment);
    });

    return items;
}

function occasionalFeedItemCreation(paymentItems, left, occasionalItems) {
    var occasinalSum = 0;
    occasionalItems.forEach((item) => {
        occasinalSum += item.amount
    });
    left -= occasinalSum;
    paymentItems.push(
        new itemSchema("After all payments",
            left + " left",
            "left"
        )
    );
}

function initFeed(usrFincaial, usrOccasional) {
    var res = [
        [],
        []
    ];
    var left;
    res[0] = itemCreation(usrFincaial);
    res[1] = occasionalCreation(usrOccasional, res[0]);
    left = parseInt(res[0][1].content.replace(' left', ''));
    occasionalFeedItemCreation(res[0], left, res[1]);
    return res;
}
