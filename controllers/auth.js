const jwt = require("jsonwebtoken")
const mailService = require("../services/mailer")
const User = require("../models/user")
const filterObj = require("../utils/filterObj")
const optGenerator = require("otp-generator")
const crypto = require("crypto")
const { promisify } = require("util")

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET)

exports.register = async (req, res, next) => {
    const { firstName, lastName, email, password } = req.body
    const existingUser = await User.findOne({ email: email })
    const filteredBody = filterObj(req.body, "firstName", "lastName", "password", "email")
    if (existingUser && existingUser.verified) {
        res.status(400).json({
            status: "error",
            message: "Email is already in use, Please Login."
        })
        return
    }
    else if (existingUser) {
        await User.findOneAndUpdate({ email: email }, filteredBody, { new: true, validateModifiedOnly: true })
        req.userId = existingUser._id
        next()
    }
    else {
        const newUser = await User.create(filteredBody)
        req.userId = newUser._id
        next()
    }
}

exports.sendOTP = async (req, res, next) => {
    const { userId } = req
    const newOtp = optGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false })

    const otpExpiryTime = Date.now() + 10 * 60 * 1000 // 10 min after otp is send
    const user = await User.findByIdAndUpdate(userId, {
        otpExpiryTime: otpExpiryTime,
      });
    
      user.otp = newOtp.toString();
    
      await user.save({ new: true, validateModifiedOnly: true });
    
      console.log(newOtp);
    // mailService.sendMail({
    //     from:"contact@chatify.com",
    //     to:"example@gmail.com",
    //     subject:"OTP for Chatify Registration",
    //     text:`Your OTP for the registration is ${newOtp}. This is valid for 10 mins`
    // })
    res.status(200).json({
        status: "success",
        message: "OTP Sent Successfully!"
    })
}

exports.verifyOTP = async (req, res, nex) => {
    const { email, otp } = req.body
    const userDoc = await User.findOne({ email: email, otpExpiryTime: { $gt: Date.now() } })

    if (!userDoc) {
        res.status(400).json({
            status: "error",
            message: "Email is Invalid or OTP expired"
        })
        return
    }
    if (!(await userDoc.correctOTP(otp, userDoc.otp))) {
        res.status(400).json({
            status: "error",
            message: "OTP is incorrect"
        })
        return
    }

    userDoc.verified = true
    userDoc.otp = undefined

    await userDoc.save({ new: true, validateModifiedOnly: true })

    const token = signToken(userDoc._id);

    res.status(200).json({
        status: "success",
        message: "OTP verified successfully",
        token,
        user_id: userDoc._id
    })
}

exports.login = async (req, res, next) => {
    const { email, password } = req.body

    if (!email || !password) {
        res.status(400).json({
            status: "error",
            message: "Both email and password are required"
        })
        return
    }

    const userDoc = await User.findOne({ email: email }).select("+password")

    if (!userDoc || !(await userDoc.correctPassword(password, userDoc.password))) {
        res.status(400).json({
            status: "error",
            message: "Email or Password is incorrect"
        })
        return
    }

    const token = signToken(userDoc._id);

    res.status(200).json({
        status: "success",
        message: "Logged in successfully",
        token,
        user_id: userDoc._id
    })
}

exports.protect = async (req,res,next) => {
  let token
  if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
    token = req.headers.authorization.split(" ")[1]
  }
  else if(req.cookies.jwt){
    token = req.cookies.jwt
  }
  else{
    res.status(400).json({
        status:"error",
        message:"You are not logged In! Please log in"
    })
    return
  }
  const decoded = await promisify(jwt.verify)(token,process.env.JWT_SECRET)
  const thisUser = await User.findById(decoded.userId)
  if(!thisUser){
    res.status(400).json({
        status:"error",
        message:"The User doesn't exist"
    })
    return
  }


  if(thisUser.changedPasswordAfter(decoded.iat)){
    res.status(400).json({
        status:"error",
        message:"User Recently update Password, Please Login again"
    })
    return
  }
  req.user = thisUser
  next()
}

exports.forgotPassword = async (req, res, next) => {
  const userDoc = await User.findOne({email:req.body.email})
  if(!userDoc){
    res.status(400).json({
        status:"error",
        message:"There is no user with given email address"
    })
    return;
  }

  const resetToken = userDoc.createPasswordResetToken()
  const resetURL = `https://chatify.com/reset-password/?code=${resetToken}`
  try {
    // send resetUrl to user
    res.status(200).json({
        status:"error",
        message:"Reset Password link sent to email"
    }) 
  } catch (error) {
    userDoc.passwordResetToken = undefined
    userDoc.passwordResetExpires = undefined

    await userDoc.save({validateBeforeSave:false})
    res.status(500).json({
        status:"error",
        message:"There was an error sending the email, Please try again Later"
    })
    return
  }
}

exports.resetPassword = async (req, res, next) => {
   const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex")
   const userDoc = await User.findOne({
    passwordResetToken:hashedToken,
    passwordResetExpires: {$gt:Date.now()}
   })

   if(!userDoc){
    res.status(400).json({
        status:"error",
        message:"Token is Invalid or Expired"
    })
    return
}
     userDoc.password = req.body.password
     userDoc.passwordCofirm = req.body.passwordConfirm
     userDoc.passwordResetToken = undefined
     userDoc.passwordResetExpires = undefined
     await userDoc.save()

     const token = signToken(userDoc._id);

     res.status(200).json({
         status: "success",
         message: "Password Changed successfully",
         token
     }) 

}