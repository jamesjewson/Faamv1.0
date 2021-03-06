const router = require("express").Router()
const mUser = require("../models/mUser")
const mPost = require("../models/mPost")
const mImage = require("../models/mImage")
const bcrypt = require("bcrypt")
const cloudinary = require("../middleware/cloudinary");
const mNotification = require("../models/mNotification")
MongoClient = require('mongodb').MongoClient


router.get("/allUsers", async (req,res)=>{
  try {
    const allUsers = await mUser.find()
    for(let i=0; i<allUsers.length; i++){
      const userProfilePic = await mImage?.find({ userId: allUsers[i]._id.valueOf(), isProfilePic: "true" })
      allUsers[i].profilePicture = userProfilePic[0]?.img
    }
    res.status(200).json(allUsers)  
  } catch (error) {
    res.status(501)
    console.log(error);
  }
})

//Get a user
router.get("/", async (req,res)=>{
  const userId = req.query?.userId;
  const username = req.query?.username;
  try{
      const user = userId ? await mUser.findById(userId) : await mUser.findOne({username:username});
      //This line removes password and updatedAt in the response, but sends everything else. Other can be called whatever you want   
      const {password,updatedAt, ...other} = user._doc
      const userProfilePic = await mImage?.find({ userId: other._id, isProfilePic: "true" })
      other.profilePicture = userProfilePic[0]?.img
      res.status(200).json(other)
  }catch (err){
      res.status(500).json(err)
  }
})


router.get("/currentUser/:userId", async (req,res)=>{
  const userId = req.params.userId;
  try {
    const user = await mUser.findById(userId)
    const {password,updatedAt, ...other} = user?._doc
    const userProfilePic = await mImage?.find({ userId: other._id, isProfilePic: "true" })
    other.profilePicture = userProfilePic[0]?.img
    res.status(200).json(other)  
  } catch (error) {
    console.log(error);
  }
})



//Notifications
router.get("/notifications/:id", async (req,res)=>{
  try {
    //find all notifications with userId 
    const notifications = await mNotification.find({ receiver: req.params.id })
    let i = 0;
    for(const notification of notifications){
      //Get sender ID
      const senderStuff = await mUser.find({ _id: notification.sender})
      const userProfilePic = await mImage.find({ userId: senderStuff[0]._id, isProfilePic: "true" })
      notifications[i].senderPic = userProfilePic[0].img
      //Not having this next line breaks it...
      notifications[i].senderName = senderStuff[0].username
      i++
    }
    res.status(200).json(notifications)
    
  } catch (error) {
    console.log(error);
  }
})




//Follow a user
router.put("/:id/follow", async (req, res) => {
  if (req.body.userId !== req.params.id) {
    try {
      const user = await mUser.findById(req.params.id);
      const currentUser = await mUser.findById(req.body.userId);
      if (!user.followers.includes(req.body.userId)) {       
        //Update following
        await user.updateOne({ $push: { followers: req.body.userId } });
        await currentUser.updateOne({ $push: { following: req.params.id } });
        //Send notification to followed user here (Future)
        res.status(200).json("user has been followed");
      } else {
        res.status(403).json("you allready follow this user");
      }
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("you cant follow yourself");
  }
});

//Unfollow a user
router.put("/:id/unfollow", async (req, res) => {
  if (req.body.userId !== req.params.id) {
    try {
      const user = await mUser.findById(req.params.id);
      const currentUser = await mUser.findById(req.body.userId);
      if (user.followers.includes(req.body.userId)) {
        await user.updateOne({ $pull: { followers: req.body.userId } });
        await currentUser.updateOne({ $pull: { following: req.params.id } });
        res.status(200).json("user has been unfollowed");
      } else {
        res.status(403).json("you dont follow this user");
      }
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("you cant unfollow yourself");
  }
});

//Get Friends
router.get("/friends/:userId", async (req,res)=>{
  try{
      const user = await mUser.findById(req.params.userId)
      const friends = await Promise.all(
          user.following.map(friendId=>{
              return mUser.findById(friendId)
      }))
      let friendList = [];
      for(let i=0; i< friends.length; i++){
        const userProfilePic = await mImage.find({ userId: friends[i]._id.valueOf(), isProfilePic: "true" })
        friends[i].profilePicture = userProfilePic[0].img
        const friend = { 
          _id: friends[i]._id,
          profilePicture: friends[i].profilePicture,
          username: friends[i].username
        }
        friendList.push(friend)
      }
      res.status(200).json(friendList)
  }catch(err){
      res.status(500).json(err)
  }
})


//Update User 
  router.put("/:id", async(req,res)=>{
    //Check to see if it's the user
    if(req.body.userId === req.params.id || req.body.isAdmin){
        //If they want to change the password, to be used in the future
        if(req.body.password){
            try {
                const salt = await bcrypt.genSalt(10)
                req.body.password = await bcrypt.hash(req.body.password, salt)
            } catch (err){
                return res.status(500).json(err)
            }
        }
        try{
            const user = await mUser.findByIdAndUpdate(req.params.id, {$set: req.body,})
            res.status(200).json("Account has been updated")
        } catch (err){
            return res.status(500).json(err)
        }
    }else {
        return res.status(403).json("You can update only your account")
    }
})


//Delete User
  router.delete("/:id", async(req,res)=>{      
    if(req.body.user._id === req.params.id || req.body.isAdmin){
      const client = new MongoClient(process.env.DB_STRING)
      await client.connect()
      const session = client.startSession()
        try{
            session.withTransaction( async ()=>{
              const images = await mImage?.find({ userId: req.params.id})
              images?.forEach(image => {
                cloudinary.uploader.destroy(image.cloudinaryId)
              });
              await mUser.findByIdAndDelete({ _id: req.params.id})
              await mImage?.deleteMany({ userId: req.params.id })
              await mPost?.deleteMany({ userId: req.body.user._id})
          })
            res.status(200).json("Account has been deleted")
        } catch (err){
            return res.status(500).json(err)
        }
        finally{
          await session.endSession();
          await client.close()
        }
    }else {
        return res.status(403).json("You can delete only your account")
    }
  })

module.exports = router