const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

require('dotenv').config();

const app = express();

const { Post } = require('./db/models/Post');
const { User } = require('./db/models/User');

const { authenticate } = require('./middleware/authenticate');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static('assets'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cookieParser());

const posts = require('./helpers/posts');

app.get('/', (req, res) => {
    posts
        .getPosts(1, req.cookies) // it returns resolved promise contains news
        .then((posts) => {
            if (req.cookies.token){
                User.checkByToken(req.cookies.token)
                .then((account) => {
                    const user = {
                        name: account.username,
                        email: account.email
                    };
                    res.render('pages/home', { posts, user })
                })
                .catch(console.log);
            } else res.render('pages/home', {posts, user: null});      
        })
        .catch(console.log)
});

app.post('/posts', (req, res) => {
    console.log('here and', req.body)
    posts
        .getPosts(req.body.page, req.cookies)
        .then((articles) => res.json({ articles }))
        .catch(console.log) 
});

app.post('/favorites', authenticate, (req, res) => {
    if (req.user.favorites.length === 0){
        return res.json({ success: false });
    }

    const favPosts = [];
    const getFavPosts = (postId) => {
        return new Promise((resolve, reject) => {
            Post.findById(postId)
                .then(resolve)
                .catch(reject);
        });
    }; 

    const allFavPosts = []; 

    // this let to pack all resolved Promises
    req.user.favorites.forEach((id) => {
        allFavPosts.unshift(getFavPosts(id));
    });

    Promise.all(allFavPosts)
        .then((favs) => res.json({favs}))
        .catch(console.log)
});

app.get('/signup', (req, res) => {
    if (req.cookies.token) res.redirect('/');
    res.render('pages/signup');
});

app.post('/signup', (req, res) => {
    if (req.cookies.token) res.send('How did you get here?');
    const user = req.body;
    const newUser = new User(user);
    newUser.save()
        .then(() => {
            return newUser.generateLoginToken();
        })
        .then((token) => res.header('x-token', token).send(newUser))
        .catch((e) => res.send(e))
});

app.post('/signin', (req, res) => {
    if (req.cookies.token) res.send('How did you get here?');
    const user = req.body;
    User.giveToken(user)
        .then((token) => {
            res.json({token})
        })
        .catch((e) => {
            res.redirect('/signin')
        });
});

app.delete('/logout', authenticate, (req, res) => {
    req.user.removeToken(req.token)
            .then(() => res.json({ success: true }))
            .catch(() => res.json({ success: false }));
});

app.post('/like', authenticate, (req, res) => {
    Post.findOne({title: req.body.title})
        .then((post) => {
            if (!post){
                req.body.likes = 1; 
                new Post(req.body)
                    .save()
                    .then((res) => {
                        User.findOne({ username: req.user.username })
                            .then((user) => {
                                user.favorites.push(res._id.toString());
                                user.save()
                            })
                    })
                    .then(() => res.json({ likes:1 }))
                    .catch(console.log);
            } else {
                User.findOne({ username: req.user.username }) 
                    .then((found) => {
                        if (found.favorites.indexOf(post._id.toString()) === -1) {
                            found.favorites.push(post._id.toString());
                            found.save().then(() => {
                                post.likes += 1;
                                post.save()
                                    .then(() => res.json({likes: post.likes}));
                    
                            });
                        } else {
                            found.update({
                                $pull: {
                                    favorites: post._id.toString()
                                }
                            }).then(() => {
                                post.likes -= 1;
                                post.save()
                                    .then(() => res.json({likes: post.likes}));
                            })
                            
                        }
                        
                        
                    })
                    .catch(console.log);
            }
            
        })
    
});

app.post('/view', (req, res) => {
    const visitedPost = req.body;
    Post
        .findOne({title: visitedPost.title})
        .then((post) => {
            if (!post){
                visitedPost.views = 1;
                visitedPost.likes = 0;
                const newPost = new Post(visitedPost);
                newPost.save()
                .then(() => {
                    res.json({
                        success: true
                    });
                })
                .catch((e) => {
                    res.json({
                        success: false
                    });
                });
            } else {
                post.views += 1;
                post.save().then(() => {
                    res.json({
                        success: true
                    });
                })
                .catch((e) => {
                    res.json({
                        success: false
                    });
                });
            }
        })
});

app.listen(process.env.PORT, () => {
    console.log('Server is working...')
})