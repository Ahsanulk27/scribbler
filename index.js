import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";
import MongoStore from "connect-mongo";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
import cors from "cors";
const corsConfig = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
};

env.config();

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(cors(corsConfig));

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));

// Use MongoStore with connect-mongo for persistent session storage with local MongoDB
app.use(
  session({
    store: MongoStore.create({
      // Local MongoDB connection string. Make sure your local MongoDB server is running.
      mongoUrl: "mongodb://localhost:27017/sessions",
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Home page route
app.get("/", (req, res) => {
  res.render("index", { currentUser: req.user });
});

// Explore page route
app.get("/explore", async (req, res) => {
  try {
    // 1. Get user's own blogs (only if user is logged in)
    const userBlogs = req.user ? await db.query(
      `SELECT blogs.*, users.name as author_name 
       FROM blogs 
       JOIN users ON blogs.user_id = users.id 
       WHERE user_id = $1 
       ORDER BY date DESC`,
      [req.user.id]
    ) : { rows: [] };

    // 2. Get blogs from other users
    const otherBlogs = req.user ? 
      // Exclude user's own blogs
      await db.query(
        `SELECT blogs.*, users.name as author_name 
         FROM blogs 
         JOIN users ON blogs.user_id = users.id 
         WHERE user_id != $1 
         ORDER BY date DESC`,
        [req.user.id]
      ) 
      : 
      // If not logged in, get all blogs
      await db.query(
        `SELECT blogs.*, users.name as author_name 
         FROM blogs 
         JOIN users ON blogs.user_id = users.id 
         ORDER BY date DESC`
      );

    // 3. Send data to the template
    res.render("explore", { 
      userBlogs: userBlogs.rows,
      otherBlogs: otherBlogs.rows,
      currentUser: req.user
    });
  } catch (err) {
    console.log('Error loading blogs:', err);
    res.status(500).send("Error loading blogs");
  }
});

// Route to render individual blog post
app.get("/blog/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM blogs WHERE id = $1", [req.params.id]);
    const blog = result.rows[0];

    if (!blog) {
      return res.status(404).send("Blog not found");
    }

    // Fetch comments for the blog
    const commentsResult = await db.query("SELECT comments.*, users.name AS author_name FROM comments JOIN users ON comments.user_id = users.id WHERE blog_id = $1 ORDER BY date DESC", [blog.id]);
    const comments = commentsResult.rows;

    res.render("blog", { blog, comments, currentUser: req.user });
  } catch (err) {
    console.error('Error fetching blog:', err);
    res.status(500).send("Error fetching blog");
  }
});

// Routes for Google OAuth authentication
app.get(
  "/auth/google",
  passport.authenticate("google", { 
    scope: ["email", "profile"] 
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/explore",  // Redirect after successful login
    failureRedirect: "/"         // Redirect if login fails
  })
);

// Logout route
app.get("/auth/logout", (req, res) => {
  req.logout(function(err) {
    if (err) { 
      console.log('Error logging out:', err);
      return next(err); 
    }
    res.redirect('/');  // Redirect to home page after logout
  });
});

// Route to handle blog submissions
app.post("/submit-blog", async (req, res) => {
  try {
    const { title, content } = req.body;
    await db.query('INSERT INTO blogs (title, content, date, user_id) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)', 
      [title, content, req.user.id]
    );
  } catch (err) {
    console.log('Error submitting blog:', err);
  }
  res.redirect("/explore");
});

// Route to delete any blog post
app.post("/delete-blog/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect('/auth/signin'); // Redirect if not authenticated
    }
    const result = await db.query(
      "DELETE FROM blogs WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).send("Blog not found or not authorized to delete");
    }
    res.redirect("/explore");
  } catch (err) {
    console.error('Error deleting blog:', err);
    res.status(500).send("Error deleting blog");
  }
});

// Create page route
app.get("/create", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("create", { currentUser: req.user });
  } else {
    res.redirect("/");
  } 
});

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(
  new GoogleStrategy.Strategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async function (request, accessToken, refreshToken, profile, done) {
      try {
        const result = await db.query("SELECT * FROM users WHERE google_id = $1", [profile.id]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (google_id, email, name) VALUES ($1, $2, $3) RETURNING *",
            [profile.id, profile.email, profile.displayName]
          );
          return done(null, newUser.rows[0]);
        }
        return done(null, result.rows[0]);
      } catch (err) {
        return done(err);
      }
    }
  )
);

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

app.post("/comment/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/auth/signin");
  }
  try {
    const { content } = req.body;
    const blogId = req.params.id;
    await db.query("INSERT INTO comments (blog_id, user_id, content) VALUES ($1, $2, $3)", [blogId, req.user.id, content]);
    res.redirect(`/blog/${blogId}`);
  } catch (err) {
    console.error("Error submitting comment:", err);
    res.status(500).send("Error submitting comment");
  }
});
