import express from "express";
import bodyParser from "body-parser";
import mongoose from 'mongoose';
import * as data from './data.js';

const date = new Date();
const app = express();
const port = 3000;
var tasks=[];
const  taskSchema= new mongoose.Schema({
  name:String
});
const Task=mongoose.model("Task",taskSchema);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); 
mongoose.connect(data.path(), {useNewUrlParser: true});



app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });


app.get("/", async (req, res) => {
  
  res.render("./index.ejs");
});
