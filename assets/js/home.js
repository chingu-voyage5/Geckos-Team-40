// account block
const accountButton = document.querySelector('.account-btn');
const account = document.querySelector('.account-container');

accountButton.addEventListener('click', () => account.classList.toggle('active'));

// feed
const mainFeed = document.getElementsByClassName('feed')[0];

const insertPosts = (newsFeed, post, favAction) => {
    const feedCard = document.createElement('div');
            
    feedCard.className = 'feed-card primary'
    
    newsFeed.appendChild(feedCard);
    
    const feedImageContainer = document.createElement('div');
    feedImageContainer.className = 'feed-image-container'; 
    const postImg = document.createElement('img');
    postImg.src = post.urlToImage;
    feedImageContainer.appendChild(postImg);
    
    feedCard.appendChild(feedImageContainer);
    
    const feedDetails = document.createElement('div');
    feedDetails.className = 'feed-details';
    const postSrc = document.createElement('p');
    postSrc.className = 'post-src';
    feedDetails.appendChild(postSrc);
    const sourceName = document.createElement('a');
    sourceName.href = post.url || post.source.url;
    sourceName.innerText = post.source.name;
    postSrc.appendChild(sourceName);
    const postUrl = document.createElement('a');
    postUrl.className = 'post-link';
    postUrl.target = 'blank';
    postUrl.href = post.url || post.source.url;
    postUrl.addEventListener('click', visitNews);
    const postTitle = document.createElement('h3');
    postTitle.className = 'post-title';
    postTitle.innerText = post.title;
    postUrl.appendChild(postTitle);
    feedDetails.appendChild(postUrl);
    
    const postDesc = document.createElement('p');
    postDesc.className = 'post-desc';
    postDesc.innerHTML = post.description;
    feedDetails.appendChild(postDesc);
    
    const hr = document.createElement('hr');
    feedDetails.appendChild(hr);
    
    const postBtns = document.createElement('div');
    postBtns.className = 'post-btns';
    feedDetails.appendChild(postBtns);
    
    const heart = document.createElement('span');
    heart.id = post.title;
    heart.addEventListener('click', favAction);
    postBtns.appendChild(heart);
    
    const hiddenData = document.createElement('span');
    hiddenData.style.display = 'none';
    heart.appendChild(hiddenData);
    
    const postData = [
        { id: 'description', value: post.description },
        { id: 'urlToImage', value: post.urlToImage },
        { id: 'sourceName', value: post.source.name },
        { id: 'sourceUrl', value:  post.source.url || post.url}
    ];
    
    postData.forEach((item) => {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = item.id;
        input.defaultValue = item.value;
        hiddenData.appendChild(input)
    });
    
    const label = document.createElement('span');
    label.className = 'label'
    label.id = 'like-' + post.title;
    const postLikes = document.createTextNode(post.likes);
    label.appendChild(postLikes);
    postBtns.appendChild(label);
    
    const eye = document.createElement('span');
    eye.className = 'eye';
    postBtns.appendChild(eye);
    
    const label2 = document.createElement('span');
    label2.className = 'label'
    const postViews = document.createTextNode(post.views);
    label2.appendChild(postViews);
    postBtns.appendChild(label2);
    
    feedCard.appendChild(feedDetails);
    
    const clearFix = document.createElement('div');
    clearFix.className = 'clearfix'
    feedCard.appendChild(clearFix);

    return heart; // in order to attach right icon
};

const likeThePost = (title, thePost) => {
    return new Promise((resolve, reject) => {
        const postBody = {
            title,
            description: thePost.description.value,
            urlToImage: thePost.urlToImage.value,
            source: {
                url: thePost.sourceUrl.value,
                name: thePost.sourceName.value
            }
        };
        fetch(
            'like', 
            {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify(postBody),
                headers: {
                    'Content-Type': 'application/json'
                }
        })
        .then((res) => res.json())
        .then(resolve)
        .catch(reject);
    });
    
};

const loadNews = (page = 1) => {
    return new Promise((resolve, reject) => {
        fetch(
            'posts',
            {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({ page }),
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        )
        .then((res) => res.json())
        .then((posts) => {
            const newsFeed = document.createElement('div');
            newsFeed.className = 'feed';
            posts.articles.forEach((post) => {
                const likeBtn = insertPosts(newsFeed, post);
                likeBtn.className = 'heart ' + post.liked;
                likeBtn.addEventListener('click', (e) => {
                    const thePost = e.target.getElementsByTagName('input');
                    likeThePost(e.target.id, thePost)
                        .then((info) => {
                            const actioned = document.getElementById(`like-${e.target.id}`);
                            actioned.innerText = info.likes;
                            likeBtn.classList.toggle('active');
                        });
                });
            });
            resolve(newsFeed) // return new news feed;
            
        })
        .catch(reject)
    });

    
}; 

const visitNews = (e) => { 
    const thisPost = e.target.parentElement.parentElement; 
    const field = (id) => thisPost.querySelector('#'+id).value;
    const title = e.target.innerText; 
    const newsData = {
        title,
        description: field("description"),
        urlToImage: field("urlToImage"),
        source: {
            url: field('sourceUrl'),
            name: field('sourceName')
        }
    };
    
    fetch(
        'view',
        {
            method: 'POST',
            body: JSON.stringify(newsData),
            headers: {
                'Content-Type': 'application/json'
            }
        }
    )
    .then(() => {
        let views = thisPost.querySelector('.views').innerText;
        thisPost.querySelector('.views').innerText = parseInt(views) + 1;
    })
    .catch(console.log)
};

const sourceLink = document.querySelectorAll('.post-link');
sourceLink.forEach((post) => {
    post.addEventListener('click', visitNews)  
})

// preloader
const loader = (status) => {
    if (status === 'on'){
        document.getElementById('load-more').style.display = 'none';
        document.getElementById('loader').style.display = 'block';
    } else if (status === 'off'){
        document.getElementById('loader').style.display = 'none';
        document.getElementById('load-more').style.display = 'inline-block';    
    }
};

// paginator
const nextPage = (() => {
    let page = 1;
    
    return {
        go: () => {
            loader('on');
            page += 1;
            loadNews(page)
                .then((feed) => {
                    loader('off')
                    document.getElementsByClassName('feed')[0].appendChild(feed);
                })
                .catch(console.log)
        },
        reset: () => page = 1
    };
        
})();

const paginator = document.getElementById('load-more');
paginator.addEventListener('click', nextPage.go);
