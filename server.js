const app = require("./app")
const dotenv = require("dotenv")
const mongoose = require("mongoose")
dotenv.config({
    path:"./config.env"
})

const {Server} = require("socket.io")

process.on("uncaughtException", (err) => {
    console.log("error1: ",err)
    process.exit(1)
})

const http = require("http")
const User = require("./models/user")
const FriendRequest = require("./models/friendRequest")

const server = http.createServer(app)

const io = new Server(server,{
    cors:{
        origin:"http://localhost:3000",
        methods:["GET","POST"]
    }
})

const DB = process.env.DBURI.replace("<password>",process.env.DB_PASSWORD)

mongoose.connect(DB).then((con) => {
    console.log("DB connection is successful")
}).catch((err) => {
    console.log(err)
})

const port = process.env.PORT || 8000

server.listen(port, () => {
    console.log(`App is running on port ${port}`)
})

io.on("connenction", async (socket) => {
   const user_id = socket.handshake.query["user_id"]
   const socket_id = socket.id
   if(user_id) {
    await User.findByIdAndUpdate(user_id,{socket_id})
   }
   
 socket.on("friend_request", async (data) =>{
       console.log(data.to)
       const to_user = await User.findById(data.to).select("socket_id")
       const from_user = await User.findById(data.from).select("socket_id")
       
       await FriendRequest.create({
           sender:data.from,
           recipient:data.to,
        })
        io.to(to_user.socket_id).emit("new_friend_request", {
            message:"New Friend Request Recieved"
        })
    io.to(from_user.socket_id).emit("request_sent",{
        message:"Request Send Successfully"
    })
})

socket.on("accept_request", async (data) => {
    console.log(data)
    const request_doc = await FriendRequest.findById(data.request_id)
    const sender = await User.findById(request_doc.sender)   
    const recevier = await User.findById(request_doc.recipient)
    sender.friends.push(request_doc.recipient)
    recevier.friends.push(request_doc.sender)
    await sender.save({new:true , validateModifiedOnly:true})   
    await sender.save({new:true , validateModifiedOnly:true})
    await FriendRequest.findByIdandDelete(data.request_id)
    io.to(sender.socket_id).emit("request_accepted",{
        message:"Friend Request Accepted"
    })
    io.to(recevier.socket_id).emit("request_accepted",{
        message:"Friend Request Accepted"
    })
    socket.on("end",function () {
        console.log("Closing Connection")
        socket.disconnect(0)
    })
})
})

process.on("unhandledRejection", (err) => {
    console.log("error2: ",err)
    process.exit(1)
})