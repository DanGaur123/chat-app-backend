const mongoose = require("mongoose")

const MessageSchema = new mongoose.Schema({
      participants : [{
        type : mongoose.Schema.ObjectId,
        ref:"User"
      }],
      messages : [
        {
            to: {
                type: mongoose.Schema.ObjectId,
                ref:"User"
            },
            from : {
                type: mongoose.Schema.ObjectId,
                ref:"User"
            },
            type: {
                type:String,
                enum : ["msg","Divider"],
            },
            subType : {
                type : String,
                enum: ["Text","Media","Document","Link"]
            },
            created_at: {
                type: Date,
            },
            text : {
                type : String
            },
            file : {
                type : String,
            },
        }
      ]
})

const Message = new mongoose.model("Message",MessageSchema)
module.exports = Message