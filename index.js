import express from "express";
import bodyParser from "body-parser";
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import * as data from './data.js';

const date = new Date();
const app = express();
const port = 3000;
const SALT_WORK_FACTOR = 10;

//user
const  userSchema= new mongoose.Schema({
  username:{
    type: String,
    required: true,
    unique: true
  },
  email:{
    type: String,
    required: true,
    unique: true
  },
  password:{
    type: String,
    required: true
  }
});
userSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);
            user.password = hash;
            next();
        });
    });
});   
userSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};
const User=mongoose.model("User",userSchema);

//financial details
const  financialSchema= new mongoose.Schema({
    income:{
      type: Number,
      required: true,
    },
    mounthlySavings: Number,
    regularPayments: []
    
  });
  const Financial=mongoose.model("Financial",financialSchema);


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); 
mongoose.connect(data.path(), {useNewUrlParser: true});



app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });


app.get("/",  (req, res) => {
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  res.render("./index.ejs",{currentUrl:fullUrl});
});

app.get("/signup",  (req, res) => {
  
    res.render("./signup.ejs");
  });

app.post("/signup",async(req,res)=>{
    var userName=req.body.username;
    var email=req.body.email;
    var password=req.body.password;
    var income=req.body.income;
    var mounthlySavings=req.body.mounthlySavings;

   

    var user=new User({
        username:userName,
          email:email,
          password:password
    });

    try{
        await user.save();
    }
    catch(err){
        errOcurred(err,res,req);
    }


    var financial=new Financial({
        income:income,
       mounthlySavings: mounthlySavings,
      
        
      });

    try{
        await financial.save();
        console.log(userName+" was added succesfully");
    }
    catch(err){
        
        errOcurred(err,res,req);
    }
    res.render("./index.ejs",{currentUrl:fullUrl,name:userName});
});
app.post('/login',async(req,res)=>{
    var email=req.body.email;
    var password=req.body.password;
    var usr;
    var isMatch;
    await User.findOne({email:email},function(err, usr) {
        if (err) errOcurred(err,res,req);;});

    await usr.comparePassword(password,function(err, isMatch) {
        if (err) errOcurred(err,res,req);;});
    if(!isMatch){
        rrOcurred('there is a typo',res,req);
    }
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  res.render("./index.ejs",{currentUrl:fullUrl,name:usr.userName});
});

function errOcurred(err,res,req)
{
    console.log(err);
    User.deleteOne({uaserName:userName});
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    res.render("./errorHandler.ejs",{currentUrl:fullUrl,err:err});
}