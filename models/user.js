const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "First Name is Required"]
    },
    lastName: {
        type: String,
        required: [true, "Last Name is Required"]
    },
    avatar: {
        type: String
    },
    email: {
        type: String,
        required: [true, "Email is Required"],
        validate: {
            validator: function (email) {
                return String(email).toLowerCase().match(
                    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                )
            },
            message: (props) => `Email (${props.email}) is invalid`
        }
    },
    password: {
        type: String,
    },
    passwordConfirm: {
        type: String,
    },
    passwordChangeAt: {
        type: Date
    },
    passwordResetToken: {
        type: String
    },
    passwordResetExpires: {
        type: Date
    },
    createdAt: {
        type: Date
    },
    updatedAt: {
        type: Date
    },
    verified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String,
    },
    otpExpiryTime: {
        type: Date
    },
    socket_id : {
        type: String
    },
    friends: [
        {
            type: mongoose.Schema.ObjectId,
            ref:"User"
        }
    ]
})



userSchema.pre("save", async function (next) {
    
    if (!this.isModified("otp") || !this.otp) {
        console.log("not working")
        return next()
    } 
  
    this.otp = await bcrypt.hash(this.otp.toString(), 12)
  
    console.log(this.otp.toString(), "FROM PRE SAVE HOOK")
  
    next()
  })

  userSchema.pre("save", async function (next) {
    if (!this.isModified("password") || !this.password){
         console.log("not working either")
        return next()
    } 
  
    this.password = await bcrypt.hash(this.password, 12)
    next()
  })

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
    return await bcrypt.compare(candidateOTP, userOTP)
}

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex")
    this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex")
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000
    return resetToken
}

userSchema.methods.changedPasswordAfter = function (timestamp) {
    return timestamp < this.passwordChangeAt
}
const User = new mongoose.model("User", userSchema)
module.exports = User