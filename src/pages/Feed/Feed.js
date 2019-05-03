import React, { Component, Fragment } from "react";
import openSocket from "socket.io-client";

import Post from "../../components/Feed/Post/Post";
import Button from "../../components/Button/Button";
import FeedEdit from "../../components/Feed/FeedEdit/FeedEdit";
import Input from "../../components/Form/Input/Input";
import Paginator from "../../components/Paginator/Paginator";
import Loader from "../../components/Loader/Loader";
import ErrorHandler from "../../components/ErrorHandler/ErrorHandler";

import "./Feed.css";
// const socket = openSocket("http://localhost:8080");
// https://node-restapi-messages.herokuapp.com
const socket = openSocket("https://node-restapi-messages.herokuapp.com");
// const axios = require('axios');

class Feed extends Component {  
  
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: "",
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };

  componentDidMount() {
    // http://localhost:8080/auth/status
    // https://node-restapi-messages.herokuapp.com
    fetch("https://node-restapi-messages.herokuapp.com/auth/status", {
      headers: {
        Authorization: "Bearer " + this.props.token
      }
    })
      .then(res => {
        if (res.status !== 200) {
          throw new Error("Failed to fetch user status.");
        }
        return res.json();
      })
      .then(resData => {
        this.setState({ status: resData.status });
      })
      .catch(this.catchError);

    this.loadPosts();
    // const socket = openSocket("http://localhost:8080");
    socket.on("posts", data => {
      if (data.action === "create") {
        this.addPost(data.post);
      } else if (data.action === "update") {
        this.updatePost(data.post);
      } else if (data.action === "delete") {
        this.loadPosts();
      }
    });
  }

  componentWillUnmount() {
    socket.removeAllListeners();
  }

  addPost = post => {
    this.setState(prevState => {
      const updatedPosts = [...prevState.posts];
      if (prevState.postPage === 1) {
        if (prevState.posts.length >= 2) {
          updatedPosts.pop();
        }
        updatedPosts.unshift(post);
      }
      return {
        posts: updatedPosts,
        totalPosts: prevState.totalPosts + 1
      };
    });
  };

  updatePost = post => {
    this.setState(prevState => {
      const updatedPosts = [...prevState.posts];
      const updatedPostIndex = updatedPosts.findIndex(p => p._id === post._id);
      if (updatedPostIndex > -1) {
        updatedPosts[updatedPostIndex] = post;
      }
      return {
        posts: updatedPosts
      };
    });
  };

  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === "next") {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === "previous") {
      page--;
      this.setState({ postPage: page });
    }
    // http://localhost:8080/feed/posts?page=
    // https://node-restapi-messages.herokuapp.com
    fetch("https://node-restapi-messages.herokuapp.com/feed/posts?page=" + page, {
      headers: {
        Authorization: "Bearer " + this.props.token
      }
    })
      .then(res => {
        if (res.status !== 200) {
          throw new Error("Failed to fetch posts.");
        }
        return res.json();
      })
      .then(resData => {
        this.setState({
          posts: resData.posts.map(post => {
            return {
              ...post,
              imagePath: post.imageUrl
            };
          }),
          totalPosts: resData.totalItems,
          postsLoading: false
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("newStatus", this.state.status);
    // console.log(status);
    // http://localhost:8080/auth/status
    // https://node-restapi-messages.herokuapp.com
    fetch("https://node-restapi-messages.herokuapp.com/auth/status", {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + this.props.token
      },
      body: formData
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Can't update status!");
        }
        return res.json();
      })
      .then(resData => {
        // console.log(resData);
        this.setState({
          status: resData.status
        });
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };
      // console.log(loadedPost);
      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = postData => {
    this.setState({
      editLoading: true
    });
    const formData = new FormData();
    formData.append("title", postData.title);
    formData.append("content", postData.content);
    formData.append("image", postData.image);
    // Set up data (with image!)
    // http://localhost:8080/feed/post
    // https://node-restapi-messages.herokuapp.com
    let url = "https://node-restapi-messages.herokuapp.com/feed/post";
    let method = "POST";
    if (this.state.editPost) {
      // http://localhost:8080/feed/post/
      // https://node-restapi-messages.herokuapp.com
      url = "https://node-restapi-messages.herokuapp.com/feed/post/" + this.state.editPost._id;
      method = "PUT";
    }

    // const config = {
    //   headers: {
    //       'Content-Type': 'multipart/form-data'
    //   }
    // };

    fetch(url, {
      method: method,
      body: formData,
      headers: {
        Authorization: "Bearer " + this.props.token
      }
      // body: JSON.stringify({
      //   title: postData.title,
      //   content: postData.content,
      //   image: postData.image
      // })
    })
      .then(res => {
        // console.log(res); // browser console output
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Creating or editing a post failed!");
        }
        return res.json();
      })
      .then(resData => {
        // console.log(resData); // browser console output
        // const post = {
        //   _id: resData.post._id,
        //   title: resData.post.title,
        //   content: resData.post.content,
        //   creator: resData.post.creator,
        //   createdAt: resData.post.createdAt
        // };
        this.setState(prevState => {
          return {
            isEditing: false,
            editPost: null,
            editLoading: false
          };
        });
      })
      .catch(err => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err
        });
      });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    // http://localhost:8080/feed/post/
    // https://node-restapi-messages.herokuapp.com
    fetch("https://node-restapi-messages.herokuapp.com/feed/post/" + postId, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + this.props.token
      }
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Deleting a post failed!");
        }
        return res.json();
      })
      .then(resData => {
        // console.log(resData);
        let direction;
        this.setState(prevState => {
          const posts = [...prevState.posts];
          const updatedPosts = posts.filter(p => p._id !== postId);
          if (updatedPosts.length === 0) {
            direction = "previous";
          }
          return { posts: updatedPosts, postsLoading: false };
        });
        this.loadPosts(direction);
      })
      .catch(err => {
        console.log(err);
        this.setState({ postsLoading: false });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: "center" }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, "previous")}
              onNext={this.loadPosts.bind(this, "next")}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString("en-GB")}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
