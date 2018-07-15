const express = require('express');
const path = require('path');
const NewsAPI = require('newsapi');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

require('dotenv').config();

const app = express();

const newsapi = new NewsAPI(process.env.NEWSAPI);

const { Post } = require('./db/models/Post');
const { User } = require('./db/models/User');

const { authenticate } = require('./middleware/authenticate');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static('assets'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cookieParser());

app.get('/', (req, res) => {
    newsapi.v2.sources({
        category: 'technology',
        language: 'en',
        country: 'us'
    })
    .then((data) => {
        return data.sources.reduce((arr, cur) => {
            arr.push(cur.id);
            return arr;
        }, []).join(',');
    })
    .then((resources) => {
        return newsapi.v2.everything({
            sources: resources,
            language: 'en',
            page: 1
        })
    })
    .then((news) => {
        // excluding non-English news and hackernews
        return news.articles.filter((article) => {
            return article.url.indexOf('jp.') === -1
                && article.source.id !== 'hacker-news'; 
        })
    })
    .then((posts) => {
        const getPost = (post) => {
            return new Promise((resolve, reject) => {
                Post.findOne({title: post.title})
                    .then((found) => {
                        if (!found){
                            post.views = 0;
                            post.likes = 0;
                            return post;
                        } else {
                            post.views = found.views;
                            post.likes = found.likes;
                            if (req.cookies.token){
                                return User.checkByToken(req.cookies.token)
                                    .then((user) => {
                                        if (user.favorites.indexOf(found._id.toString()) > -1){
                                            post.liked = 'active';
                                            return post;
                                        } else {
                                            post.liked = '';
                                            return post;
                                        }
                                    })
                                    .catch(console.log)
                            } else {
                                return post;
                            }
                        }
                        
                    })
                    .then(resolve)
                    .catch(console.log)
            });  
        } 

        const allPromises = [];

        posts.forEach((post) => {
            allPromises.push(getPost(post))
        });

        return Promise.all(allPromises);
    })
    .then((posts) => {
        res.render('pages/home', {posts});
    })
    .catch(console.log)
});

app.post('/favorites', authenticate, (req, res) => {
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

app.get('/signin', (req, res) => {
    if (req.cookies.token) res.redirect('/');
    res.render('pages/signin');
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

app.post('/like', authenticate, (req, res) => {
    Post.findOne({title: req.body.title})
        .then((post) => {
            if (!post){
                req.body.likes = 1;
                console.log(req.body)  
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

app.get('/profile', authenticate, (req, res) => {
  res.render('pages/profile');
});

app.get('/search', (req, res) => {
  res.render('pages/search');
});

app.listen(3000, () => {
    console.log('Server is working...')
})