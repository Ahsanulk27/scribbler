import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = process.env.PORT || 3000;
import cors from "cors";
const corsConfig = {
  origin: "*",
  credentials: true, // Fix the typo here
  methods: ["GET", "POST", "PUT", "DELETE"],
};

app.use(cors(corsConfig));

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Array to store blogs
const blogs = [];

// Home page route
app.get("/", (req, res) => {
    res.render("index");
});

// Route to handle blog submissions
app.post("/submit-blog", (req, res) => {
  const { title, content } = req.body;

  const newBlog = {
    id: blogs.length + 1,
    title: title,
    content: content,
    date: new Date().toLocaleDateString(),
  };

  blogs.push(newBlog);
  res.redirect("/explore");
});

// Explore page route
app.get("/explore", (req, res) => {
  res.render("explore", { blogs: blogs });
});

// Route to render individual blog post
app.get("/blog/:id", (req, res) => {
    const blogId = parseInt(req.params.id);
    const blog = blogs.find(b => b.id === blogId);

    if (blog) {
        res.render("blog", { blog: blog });
    } else {
        res.status(404).send("Blog not found");
    }
});

// Route to delete any blog post
app.post('/delete-blog/:id', (req, res) => {
  const blogId = parseInt(req.params.id);
  const blogIndex = blogs.findIndex(blog => blog.id === blogId);

  if (blogIndex !== -1) {
      blogs.splice(blogIndex, 1);  // Remove the blog from the array
  }

  res.redirect('/explore');  // Redirect back to the explore page after deletion
});


// Create page route
app.get("/create", (req, res) => {
  res.render("create");
});

// Start the server
// app.listen(port, () => {
//   console.log(`Listening on port ${port}`);
// });
