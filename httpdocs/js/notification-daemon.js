//
// (C) 2020 - ntop.org
//

const NOTIFICATION_DEBUG = false;

class PushNotificationBuilder {

    constructor(title = 'Hello World') {
        this.title = title;
        this.options = {};
        this.options.actions = [];
        this.options.icon = '/img/icons/icon-128x128.png';
        this.options.badge = '/img/icons/icon-72x72.png';
    }

    setTitle(title) {
        this.title = title;
        return this;
    }

    setBody(body) {
        this.options.body = body;
        return this;
    }

    setIcon(icon) {
        this.options.icon = icon;
        return this;
    }

    setLang(lang) {
        this.options.lang = lang;
        return this;
    }

    setRequireInteraction(interaction) {
        this.options.requireInteraction = interaction;
        return this;
    }

    setTimestamp(timestamp) {
        this.options.timestamp = timestamp;
        return this;
    }

    setOnClick(callback) {
        this.callback = callback;
        return this;
    }

    build() {

        const n = new Notification(this.title, this.options);
        if (this.callback) {
            n.onclick = this.callback;
        }
        return n;
    }

}
class NotificationManager {

    static enableNotification() {

        // ask to user the permission to send notification
        try {
            Notification.requestPermission((status) => {
                if (NOTIFICATION_DEBUG) console.info(status);
            });
        }
        catch (err) {
            console.error('Something went wrong! ☹️', err);
        }
    }

    static push(pushNotification = { title: 'Hello World', options: {} }) {

        if (!pushNotification) throw 'The notification object cannot be null!';

        if (NotificationManager.canReceiveNotification) {
            (async () => {
                try {
                    const registration = await navigator.serviceWorker.getRegistration();
                    registration.showNotification(pushNotification.title, pushNotification.options);
                }
                catch (err) {
                    console.error(err);
                }
            })();
        }
    }

    static get canReceiveNotification() {
        return NotificationManager.permissionNotification == 'granted'
    }

    static get permissionNotification() {
        return Notification.permission;
    }

}

class BlogFeed {

    /**
     * Initialize the local storage options. If there aren't any options
     * then create new ones with default paramaters.
     * The function return the localStorage['blog_feed'].
     *
     * @return {object}
     */
    static initializeLocalStorage() {

        // check if the settings exists inside the local storage
        const blogFeedSettings = localStorage.getItem('blog_feed');
        if (!blogFeedSettings) {

            // create empty settings for blog feed
            const emptyBlogSettings = {
                lastCheck: Date.now(),
                downloadedPosts: []
            };

            // save settings inside local storage
            localStorage.setItem('blog_feed', JSON.stringify(emptyBlogSettings));

            return emptyBlogSettings;
        }

        return JSON.parse(blogFeedSettings);
    }

    static async checkNewPosts(currentLocalStorage) {

        // initialize the local storage to store information
        // about new posts
        let aDayIsPassed;
        if (currentLocalStorage.downloadedPosts == undefined) {
            aDayIsPassed = true;
        }
        else {
            if (currentLocalStorage.downloadedPosts.length == 0) {
                aDayIsPassed = true;
            }
            else {
                aDayIsPassed = Math.floor((Date.now() - currentLocalStorage.lastCheck) / 86400000) >= 1
            }
        }

        // if a day is passed since the last check then check if there is a new post
        // inside the blog
        if (aDayIsPassed) {

            try {

                const request = await fetch('/lua/get_new_blog_posts.lua');
                const response = await request.json();
                const {posts} = response;
                const notificationToShow = [];
                if (!posts) return {fetchedPosts: [], aDayIsPassed: aDayIsPassed};

                posts.forEach((post) => {

                    const postId = post.id;
                    if (currentLocalStorage.downloadedPosts.find(shownId => shownId == postId)) return;
                    post.isNew = true;
                    notificationToShow.push(post);

                });

                return {fetchedPosts: notificationToShow, aDayIsPassed: aDayIsPassed};
            }
            catch (err) {
                if (NOTIFICATION_DEBUG) console.error("BlogFeed :: Ops, an error appeared!", err);
            }
        }

        return {fetchedPosts: [], aDayIsPassed: aDayIsPassed};
    }

    static showNotifications(newPosts, newPostsLength, currentLocalStorage) {

        const $notificationBell = $("#notification-list");
        if (newPostsLength > 0) {
            $notificationBell.prepend(
                $(`<span class="badge notification-bell badge-pill badge-danger">${newPostsLength}</span>`)
            );
        }

        const $blogSection = $(".blog-section");
        const $list = $blogSection.find("ul");
        $list.empty();

        newPosts.forEach((post, index) => {

            if (!post) return;

            const $media = $("<li></li>");
            if (index < newPosts.length - 1) {
                $media.addClass("border-bottom");
            }

            const $container = $("<div class='media-body pt-2 pr-2 pl-2 pb-1'></div>");
            const $link = $("<a class='text-dark'></a>");
            $link.attr("target", "_about");
            $link.attr("href", post.link);

            $link.append(
                $(`
                    <h6 style='max-width: 24em' class='mt-0 mb-1 text-truncate'>
                        ${post.isNew ? "<span class='badge badge-danger'>New</span>" : ""}
                        ${post.title}
                        <i class='fas fa-external-link-alt'></i>
                    </h6>
                `),
                $("<p class='mb-0'></p>").html(post.shortDesc),
                $("<small class='mb-0'></small>").html(post.date)
            );

            $container.append($link);
            $media.append($container);

            $list.append($media);

        });

        if (newPostsLength > 0) {
            // remove the badge when open link notifications
            $notificationBell.off('click').click(function(event) {

                $notificationBell.find("span.badge").remove();
                $notificationBell.off('click');

                // mark all the posts as old
                // merge the arrays and save them into local storage
                const oldPosts = newPosts.map(post => {
                    post.isNew = false;
                    return post;
                })
                const newLocalStorage = [...oldPosts, ...currentLocalStorage.downloadedPosts];
                BlogFeed.saveDownloadedPosts(newLocalStorage);

                $notificationBell.click('click', function() {
                    // remove new badges
                    $('div.blog-section span.badge.badge-danger').fadeOut().remove();
                });
            });
        }

    }

    static saveDownloadedPosts(downloadedPosts) {

        localStorage.removeItem('blog_feed');
        localStorage.setItem('blog_feed', JSON.stringify({
            lastCheck: Date.now(),
            downloadedPosts: downloadedPosts,
        }));
    }

    static queryBlog() {

        const currentLocalStorage = BlogFeed.initializeLocalStorage();
        (async() => {

            const {fetchedPosts, aDayIsPassed} = await BlogFeed.checkNewPosts(currentLocalStorage);
            if (!aDayIsPassed) {

                const toShow = [
                    currentLocalStorage.downloadedPosts[0],
                    currentLocalStorage.downloadedPosts[1],
                    currentLocalStorage.downloadedPosts[2]
                ];

                let counter = 0;
                toShow.forEach((p) => {
                    if (!p) return;
                    if (p.isNew) counter++;
                })

                BlogFeed.showNotifications(toShow, counter, currentLocalStorage);
                return;
            }

            const newPosts = fetchedPosts.filter(post => {
                return !(currentLocalStorage.downloadedPosts.find(post2 => post.id == post2.id));
            });

            // remove the older posts from the local storage
            for (let i = 0; i < newPosts; i++) {
                currentLocalStorage.downloadedPosts.pop();
            }

            // show new post notifications
            const sorted = currentLocalStorage.downloadedPosts;
            let toShow = [];

            if (newPosts.length == 1) {
                toShow = [newPosts[0], sorted[0], sorted[1]];
            }
            else if (newPosts.length == 2) {
                toShow = [newPosts[0], newPosts[1], sorted[0]];
            }
            else if (newPosts.length == 3) {
                toShow = newPosts;
            }
            else {
                toShow = sorted;
            }

            BlogFeed.showNotifications(toShow, newPosts.length, currentLocalStorage);

            // merge the arrays and save them into local storage
            const newLocalStorage = [...newPosts, ...currentLocalStorage.downloadedPosts];
            BlogFeed.saveDownloadedPosts(newLocalStorage);

        })();
    }

}
