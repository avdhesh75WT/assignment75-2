import { Request, Response } from "express";
import User from "../models/User";
import { v2 as cloudinary } from "cloudinary";
import Post from "../models/Post";
import Comment from "../models/Comment";

//GET ROUTE TO FETCH ALL THE USERS FROM THE DATABASE
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({});
    if (!users.length) res.status(200).json("No users found");
    const payload = users.map((user) => {
      const updatedUser = user;
      updatedUser.password = "";
      updatedUser.posts = [];
      return updatedUser;
    });
    return res.status(200).json(payload);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

//GET ROUTE TO FETCH A SINGLE AUTHENTICATED USER FROM THE DATABASE
export const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;
    // const user = await User.findById(id).populate("Posts");
    const user = await User.findById(id);
    if (!user) res.status(400).json("User not Found");
    let payload = null;
    if (user) {
      user.password = "";
      payload = user;
    }
    return res.status(200).json(payload);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

//POST ROUTE TO CREATE A POST IN DATABASE
export const createPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;
    const image = req.file;
    const { title, description } = req.body;
    if (!title) return res.status(400).json("Title field can not be empty");
    const user = await User.findById(id);
    if (!user) return res.status(400).json("User does not exist");
    let imageUrl = null;
    let fileName = null;
    if (image?.filename) {
      await cloudinary.uploader.upload(
        image.path,
        { folder: "postApp" },
        (err, res) => {
          if (err) console.log(err);
          else {
            if (res) {
              imageUrl = res.url;
              fileName = res.public_id;
            }
          }
        }
      );
    }
    let userposts = user.posts;
    const newPost = await Post.create({
      title,
      description,
      photo: {
        url: imageUrl,
        filename: fileName,
      },
      author: req.user.id,
    });
    await newPost.save();
    userposts.push(newPost._id);
    await User.findByIdAndUpdate(id, { posts: userposts });
    return res.status(200).json("Post created succesfully");
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

//PATCH ROUTE TO UPDATE USER PROFILE
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;
    const { userName } = req.body;
    if (userName.lenght < 5)
      return res.status(400).json("Username must be atleast 5 letters long");
    await User.findByIdAndUpdate(id, { userName });
    return res.status(200).json("User updated successfully");
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

//PATCH ROUTE TO UPDATE USER POST
export const updatePost = async (req: Request, res: Response) => {
  try {
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

//DELETE ROUTE TO DELETE USER POST
export const deletePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;
    const { postId } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(400).json("User does not exist");
    const post = await Post.findById(postId);
    if (!post) return res.status(400).json("Post does not exist");
    const postcomments = post.comments;
    const userPosts = user.posts;
    const updatedUserPosts = userPosts.filter((post) => {
      return post.toString() !== postId;
    });
    for (let comment of postcomments) {
      await Comment.findByIdAndDelete(comment);
    }
    if (post.photo?.url) {
      await cloudinary.uploader.destroy(post.photo?.filename!, (result) => {
        console.log("res from cloudinary:-> ", result);
      });
    }
    await Post.findByIdAndDelete(postId);
    return res.status(200).json("Post deleted successfully");
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const likeHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(400).json("Post not found");
    const isAlreadyLiked = post.likes?.authors.indexOf(id);
    const authors = post.likes?.authors;
    if (isAlreadyLiked === -1) {
      authors?.push(id);
      const updatedProperties = {
        likes: {
          count: post.likes!.count + 1,
          authors,
        },
      };
      await Post.findByIdAndUpdate(postId, {
        $set: updatedProperties,
      });
      return res.status(200).json("Successfullt liked the post");
    } else {
      const updatedAuthors = authors?.filter((author) => {
        return id != author;
      });
      const updatedProperties = {
        likes: {
          count: post.likes!.count - 1,
          authors: updatedAuthors,
        },
      };
      await Post.findByIdAndUpdate(postId, {
        $set: updatedProperties,
      });
      return res.status(200).json("Successfullt disliked the post");
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const { postId } = req.params;
    if (!content) return res.status(400).json("Please enter your comment");
    const post = await Post.findById(postId);
    if (!post) return res.status(400).json("Post does not exist");
    const newComment = await Comment.create({
      content,
      author: req.user.id,
      atPost: postId,
    });
    await newComment.save();
    let comments = post.comments;
    comments.push(newComment._id);
    await Post.findByIdAndUpdate(postId, { comments });
    return res.status(200).json("Added your comment");
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json("Please enter comment");
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(400).json("Comment not found");
    await Comment.findByIdAndUpdate(commentId, { content });
    return res.status(200).json("comment updated successfully");
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
