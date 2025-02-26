import mongoose,{Schema, Types} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber:{
        type:Schema.Types.ObjectId, //one who is subscribing
        ref:"user"
    },
    channel:{
        type:Schema.Types.ObjectId, //one to whom 'subscriber' is subscribing
        ref:"user"
    }
},
{
    timestamps:true
})


export const Subscription=mongoose.model("Subscription",subscriptionSchema)