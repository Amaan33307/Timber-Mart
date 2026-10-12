const session = require("express-session");
const mongoose = require("mongoose");


// ========================================
// MONGODB SESSION STORE
// Keeps login sessions in the "sessions" collection
// so users stay logged in on Vercel (serverless),
// where server memory is not shared between requests.
// ========================================

class MongoSessionStore extends session.Store {

    constructor() {

        super();

        this.indexReady = false;

    }


    collection() {

        const sessions =
            mongoose.connection.collection("sessions");

        // Expired sessions are removed automatically by MongoDB
        if (!this.indexReady) {

            this.indexReady = true;

            sessions
                .createIndex({ expires: 1 }, { expireAfterSeconds: 0 })
                .catch(() => { this.indexReady = false; });

        }

        return sessions;

    }


    expiryOf(sess) {

        if (sess && sess.cookie && sess.cookie.expires) {
            return new Date(sess.cookie.expires);
        }

        return new Date(Date.now() + 1000 * 60 * 60 * 24);

    }


    get(sid, callback) {

        this.collection()
            .findOne({ _id: sid })
            .then((doc) => {

                if (!doc || doc.expires < new Date()) {
                    return callback(null, null);
                }

                callback(null, JSON.parse(doc.session));

            })
            .catch(callback);

    }


    set(sid, sess, callback = () => {}) {

        this.collection()
            .updateOne(
                { _id: sid },
                {
                    $set: {
                        session: JSON.stringify(sess),
                        expires: this.expiryOf(sess)
                    }
                },
                { upsert: true }
            )
            .then(() => callback(null))
            .catch(callback);

    }


    touch(sid, sess, callback = () => {}) {

        this.collection()
            .updateOne(
                { _id: sid },
                { $set: { expires: this.expiryOf(sess) } }
            )
            .then(() => callback(null))
            .catch(callback);

    }


    destroy(sid, callback = () => {}) {

        this.collection()
            .deleteOne({ _id: sid })
            .then(() => callback(null))
            .catch(callback);

    }

}


module.exports = MongoSessionStore;
