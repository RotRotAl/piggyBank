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
userSchema.methods.comparePassword = async function(candidatePassword) {
    var res = await bcrypt.compare(candidatePassword, this.password);
    return res;
};
const User=mongoose.model("User",userSchema);

//financial details
const  financialSchema= new mongoose.Schema({
    user:{
        type:userSchema,
        required:true,
        minlength: [4, 'Password must be at least 8 characters long'],
    maxlength: [128, 'Password must be less than 128 characters long']
    },
    income:{
      type: Number,
      required: true,
    },
    regularPayments: []
    
  });
  const Financial=mongoose.model("Financial",financialSchema);

  
  function  itemSchema(title,content,type){
   this.title=title;
   this.content=content;
   this.type=type;
  };
 

  //regularpaymentes item
  const  paymentsSchema= new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    amount:{
        type:Number,
        required:true
    },
    type:{
        type:String,
        required:true
    }
  });
  const Payment=mongoose.model("payment",paymentsSchema);



app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); 
mongoose.connect(data.path(), {useNewUrlParser: true});



app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });


app.get("/",  (req, res) => {
    console.log(req.body);
    if(req.body.username==undefined||req.body.username=='null'||req.body.username==''){
        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        res.render("./index.ejs",{currentUrl:fullUrl});
    }
   else{
    res.render("./index.ejs",{currentUrl:fullUrl,name:req.body.username});
   }
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
        user:user,
        income:income,
       
      
        
      });

    try{
        if(mounthlySavings!=null&&mounthlySavings!=undefined&&mounthlySavings!='')
        {
            var mounthlySavingsPayment= new Payment({
                title:'mounthly savings',
                amount:mounthlySavings,
                type:'savings'
            });
            financial.regularPayments.push(mounthlySavingsPayment);
        }
        await financial.save();
        console.log(userName+" was added succesfully");
    }
    catch(err){
        
        errOcurred(err,res,req);
    }
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    res.render("./index.ejs",{currentUrl:fullUrl,name:userName});
});
app.post('/login',async(req,res)=>{
    var email=req.body.email;
    var password=req.body.password;
    var usr;
    var isMatch=false;
    usr=await User.findOne({email:{$eq:email}}).
    catch((err)=>
        {
             errOcurred(err,res,req)
             ;});
            
       
        try{
            isMatch= await usr.comparePassword(password);
        }
        catch(err){
            
                 errOcurred(err,res,req);
            }
    if(!isMatch){
        errOcurred('there is a typo',res,req);
    }
    else{
        var usrFincaial= await Financial.findOne({'user._id' : usr._id});
        var items=[];
        var usrRegularregularPayments= usrFincaial.regularPayments;
        usrRegularregularPayments.forEach((payment)=>{
            var temp=new itemSchema(payment.title,
                "your paying for that :"+payment.amount+" a mounth",
                payment.type.toString()
            );
            items.push(temp);
        });
        console.log(items);
        res.render("./index.ejs",{name:usr.username,items:items});
    }
   
});

function errOcurred(err,res,req)
{
    console.log(err);
    var fullUrl = req.protocol + '://' + req.get('host');
    res.render("./errorHandler.ejs",{currentUrl:fullUrl,err:err});
}