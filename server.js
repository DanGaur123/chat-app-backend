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
})

io.on("friend_request", async (data) =>{
    console.log(data.to)
    const to = await User.findById(data.to)
    io.to(to.socket_id).emit("new_friend_request", {
         
    })
})

process.on("unhandledRejection", (err) => {
    console.log("error2: ",err)
    process.exit(1)
})