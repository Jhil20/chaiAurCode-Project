import  dotenv  from 'dotenv'
import mongoose from 'mongoose'
import connectDB from "./db/index.js"
import { app } from './app.js'

dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT ||4000, ()=>{
        console.log(`server starting at port ${process.env.PORT}`)
    } )
})
.catch((err)=>{
    console.log("connection failed : ",err)
})