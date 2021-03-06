import React from 'react'
import "./commentArray.css"
import { MoreVert } from "@material-ui/icons"
import {AuthContext} from "../../context/AuthContext"
import {Link} from "react-router-dom"
import { useContext, useEffect, useState, useRef } from 'react'
import axios from "axios"

export default function CommentArray(post) {
    const {user} = useContext(AuthContext)
    const PF = process.env.REACT_APP_PUBLIC_FOLDER
    const comment = post.post.desc
    const commentId = post.post._id
    const [showHideDropdown, setShowHideDropdown] = useState(false)
    let refClick = useRef()
    const [editingComment, setEditingComment] = useState(false)
    const [editCommentValue, setEditCommentValue] = useState("")
    const [postUser, setPostUser] = useState(post.post.user)

     //Event listeners for outside dropdown menu click
     useEffect(() => {
        document.addEventListener("click", handleShowDropdown)
        return () => {
            document.removeEventListener("click", handleShowDropdown)
        }
    }, [])

    
    //Fetch post user    
    useEffect(() =>{
        const fetchUser = async () => {
            const res = await axios.get(`/users?userId=${post?.post.commenterID}`)
            setPostUser(res.data);
        };  
        fetchUser();
    },[post?.post.commenterID]); 



    //Confirm and Delete a comment
    const confirmDelete =()=>{            
            try {
                if(window.confirm("Delete this comment? (This cannot be undone.)") === true){
                    const deletedComment = {
                        comment: post.post,
                        currentUser: user
                    }
                    post.deleteComment(deletedComment)  
                }
            } catch (err) {
                console.log(err);
            }  
    }

    // Show Post Dropdown Menu
    const clickShowCommentDropdown = ()=>{
        showHideDropdown ? setShowHideDropdown(false) : setShowHideDropdown(true)
    }

    //Edit Comment
    const editComment = ()=>{
        setEditingComment(true)
        setEditCommentValue(comment)
    }


    //Handle dropdown outside click
    const handleShowDropdown = (e)=>{
        if(!refClick.current?.contains(e.target)){
            setShowHideDropdown(false)
        }
    }

    //Save Comment
        const saveComment = ()=>{
            try {
                post.post.desc = editCommentValue
                post.saveEditComment(post.post)
                setEditingComment(false)
            } catch (error) {
                console.log(error);
            }
        }

    //Cancel Edit Comment
        const cancelEditComment = ()=>{
            setEditingComment(false)
        }


///////Return
    return( 
        <div>
            <div key={commentId} className="displayComments">
                <div className="commenterContainer">
                    <Link className="commenterContainer" to={`/profile/${user.username}`}>
                        <img className="commentsTextProfileImg" alt="profilePicture" src={postUser?.profilePicture ? postUser?.profilePicture : PF+"person/noAvatar.jpeg" } />
                        <span className="commenterUsername" >{ postUser?.username ? postUser.username : null}</span>
                    </Link>
                </div>
                {/* Edit Comment */}
                {editingComment ? (
                    <>
                        <input type="text" className="editCommentTextInput" autoFocus value={editCommentValue} onChange={(e)=> setEditCommentValue(e.target.value)} />
                        <button className="editCommentButton" type="button" onClick={saveComment}>Save</button>
                        <button className="editCommentButton cancelEditCommentButton" type="button" onClick={cancelEditComment}>Cancel</button>

                    </>
                ) : (
                    <li className="commentsText">{comment}</li> 
                )}


                {/* Dropdown Menu */}
                {user._id === postUser?._id ? (
                    <>
                        <MoreVert className="commentDropDown" onClick={clickShowCommentDropdown} ref={refClick} />
                        {showHideDropdown ? (
                            <div className="">
                                <ul className="commentDropdownMenu">
                                        <li className="commentDropdownMenuItem" onClick={editComment}>Edit</li>
                                        <li className="commentDropdownMenuItem deleteComment" onClick={confirmDelete}>Delete</li>
                                </ul> 
                            </div>
                        ) : null}
                    </>    
                ):null}
            </div>  
            <hr className="commentSectionHr"/> 
        </div>
    );  
}
