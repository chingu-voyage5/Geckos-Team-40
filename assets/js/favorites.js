const hearts = document.querySelectorAll('.heart');

hearts.forEach(heart => {
  heart.addEventListener('click', (e) => {
    const thePost = e.target.getElementsByTagName('input');
    likeThePost(e.target.id, thePost)
    .then((info) => {
        const actioned = document.getElementById(`like-${e.target.id}`);
        actioned.innerText = info.likes;
    })
    .catch(console.log)
    heart.classList.toggle('active');
  });
});

const favorites = document.getElementById('favorites-btn');

const getFavs = () => {
    fetch(
        'favorites',
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            } 
        }
    )
    .then((res) => res.json())
    .then((all) => {
        if (all.success === false){
            const newDiv = document.createElement('div');
            newDiv.className = 'feed';
            newDiv.style.backgroundColor = '#fff';
            newDiv.style.color = '#ccc';
            newDiv.style.textAlign = 'center';
            newDiv.style.paddingTop = '20px';
            newDiv.style.paddingBottom = '400px';
            newDiv.innerHTML = '<h3>There are no favorite posts.</h3>'
            const ref = document.querySelector('.category').after(newDiv)
            throw new Error('No favorites')
        }
        return all.favs;
    })
    .then((posts) => {
        const excludeFavPost = (element) => {
            // make a request that will exclude the post
            fetch(
                'like',
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify(
                        { title: element.target.id }
                    ),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            )
            .then(() => {
                setTimeout(() => {
                    // removing post represantion from DOM
                    element.target.parentElement.parentElement.parentElement.remove();
                }, 1500);

                element.target.classList.remove('active');
                const postLikes = document.getElementById('like-' + element.target.id);
                postLikes.innerText -= 1;
            })
            .catch(console.log)

        };
        const favFeed = document.createElement('div');
        favFeed.className = 'feed';

        posts.forEach((post) => {
            const insertedFavs = insertPosts(favFeed, post, excludeFavPost);
            insertedFavs.className = 'heart active';
        
        });

        if (posts.length < 2){ // avoiding front side bug
            const hiddenBlock = document.createElement('div');
            hiddenBlock.style.paddingBottom = '170px';
            hiddenBlock.style.backgroundColor = '#fff';
            favFeed.appendChild(hiddenBlock);
        }
        document.getElementsByClassName('category')[0].after(favFeed);
    })
    .catch(console.log)
};


const favsClicked = () => {
    if (getCategory('fav')){
        getFavs();
        document.getElementsByClassName('feed')[0].remove();
        paginator.style.display = 'none';
    }    
};

favorites.addEventListener('click', favsClicked);