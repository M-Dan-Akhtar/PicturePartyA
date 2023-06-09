// Declare variables
const express = require("express");
const app = express();
const PORT = 8000;
const mongoose = require("mongoose");
require('dotenv').config();

const cookieParser = require("cookie-parser");
const sessions = require('express-session');

const oneDay = 1000 * 60 * 60 * 24;

//session middleware
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false
}));
// cookie parser middleware
app.use(cookieParser());
app.use(function (req, res, next) {
    res.locals.username = req.session.username;
    next();
});


const User = require("./models/user");
const Poll = require("./models/poll");
const Redeem = require("./models/redeem");




// Set middleware
app.set("view engine", "ejs");
app.use(express.static('public'));  // makes use of a public folder for static files (css etc)
app.use(express.urlencoded({extended: true})); // validates info sent back and forth

mongoose.connect(process.env.DB_CONNECTION, 
                {useNewUrlParser: true}).then(
                ()=>{console.log("Connected to database")});


app.get("/home", async (req, res) => {
    session=req.session;
    if(session.username){
        try {
            let polls = await Poll.find();
            let users = await User.find().sort({points: -1});
            let redeems = await Redeem.find();
            res.render("home.ejs", {polls: polls, users:users, redeems: redeems})
        } catch (err) {
            console.log(err)
        }    
    }
    else
    {
        res.redirect("/")
    }


    
});

//*******************************************
// Index Page / signin / logout / register  * 
//*******************************************           
app.get("/", async (req, res) => {
    try {
        res.render("index.ejs")
    } catch (err) {
        console.log(err)
    }
});

app.get("/login", async (req, res) => {
    try {
        res.render("login.ejs")
    } catch (err) {
        console.log(err)
    }
});

app.post('/login', async (req, res) => {

    let username = req.body.username;
    let password = req.body.password;
    
    let user_exist = await User.find({username:username, password:password});
    
    if (user_exist[0] != null) {
        
        session=req.session;
        session.username=req.body.username;

        res.redirect("/home");
    } 
    else
    {
        res.render('login.ejs', {result: "Invalid username/password. Please try again."})
        console.log("Invalid username/password. Please try again.");
    }
});


// Logout
app.get('/logout',(req,res) => {
    req.session.destroy();
    res.redirect('/');
});


// Register Page
app.get("/register", async (req, res) => {
    try {
        res.render("register.ejs")
    } catch (err) {
        console.log(err)
    }
});

app.post('/register', async (req, res) => {

    let username = req.body.username;
    let password = req.body.password;
    
    let user_exist = await User.find({username:username});
    
    if (user_exist[0] != null) {
        res.render('register', {result: "User already exists."})
        return;
    } 
    
    
    const new_user = new User(
        {
            username: username,
            password: password,
            points:0
        })    

    try {
        await new_user.save();
        res.redirect("/");
    } catch (err) {
        console.log(err)
        res.redirect("/");
    }
});






// Create poll
// Get method
app.get('/create_poll', async (req, res) => {
    session=req.session;
    if(!session.username){ 
        res.redirect("/"); 
        return;
    }

    try {
        res.render("create_poll.ejs")
    } catch (err) {
        console.log(err)
    }
    
});

app.post('/create_poll', async (req, res) => {
    session=req.session;
    if(!session.username){ 
        res.redirect("/"); 
        return;
    }

    let poll_author = session.username;
    let poll_title = req.body.poll_title;
    let movie_title = req.body.movie_title;
    
    const new_poll = new Poll(
            {
                poll_title: poll_title,
                poll_author: poll_author,
                movies: [ {added_by: poll_author, title: movie_title, votes: 0}],
                winner: "none"
            })    
    
    try {
        await new_poll.save();
        res.redirect("/home");
    } catch (err) {
        console.log(err)
        res.render("create_poll.ejs", {result: "Error: Fields weren't filled correctly."});
    }
});





// POLLS
// EDIT or Update
app
    .route("/poll/:id")
    .get(async (req,res) => {
        session=req.session;
        if(!session.username){ 
            res.redirect("/"); 
            return;
        }

        const id = req.params.id
        let current_poll = await Poll.find({_id:id});
        res.render('poll.ejs', {poll:current_poll[0]})
    })
 


app.route("/add_movie/:id")
    .post(async (req, res) => {
    session=req.session;
    if(!session.username){ 
        res.redirect("/"); 
        return;
    }
    
    const id = req.params.id
    let movie_title = req.body.movie_title;
   
    try
    {
        await Poll.findByIdAndUpdate(
        id,
        {
            $push : { movies: { added_by: session.username, title:movie_title}}    
        })
        res.redirect("/poll/" + id);
    }
    catch(err){console.log(err)}
    }
)

app.route("/add_vote/:poll_id/:movie_id")
    .get(async (req, res) => {
    session=req.session;
    if(!session.username){ 
        res.redirect("/"); 
        return;
    }
    
    const poll_id = req.params.poll_id 
    const movie_id = req.params.movie_id

    try
    {
        await Poll.updateOne(
        { _id : poll_id, "movies._id" : movie_id},    
        { $inc: {"movies.$.votes" : 1}, $push : { vote_list: { username: session.username}}}
        
         
        )
        res.redirect("/poll/" + poll_id);
    }
    catch(err){console.log(err)}
})

app.route("/close_poll/:poll_id")
    .get(async (req, res) => {
    session=req.session;
    if(!session.username){ 
        res.redirect("/"); 
        return;
    }
    
    const poll_id = req.params.poll_id ;
    let winner = "";
    let most_votes = 0;
    let winning_movie = "";
    let draw = false;
    try
    {
        let nPoll = await Poll.find({ _id : poll_id});
        nPoll = nPoll[0];

        for(let i = 0; i < nPoll.movies.length; ++i)
        {
            if(nPoll.movies[i].votes > most_votes)
            {
                most_votes = nPoll.movies[i].votes;
                winner = nPoll.movies[i].added_by;
                winning_movie = nPoll.movies[i].title;
                draw = false;
            }
            else if(nPoll.movies[i].votes == most_votes)
            {
                draw = true;
            }
            
        }
            
        if(draw) {
            await Poll.findByIdAndUpdate(poll_id,{ winner: "draw", winning_movie : "none" })
        }
        else
        {
            await Poll.findByIdAndUpdate(poll_id,{ winner: winner, winning_movie: winning_movie })
            await User.findOneAndUpdate({username: winner}, {$inc : {points : 1}})
        }

        res.redirect("/poll/" + poll_id);
    }
    catch(err){console.log(err)}
})


// Redeem
app.get('/redeem',(req,res) => {
    session=req.session;
    if(!session.username){ 
        res.redirect("/"); 
        return;
    }
    res.render('redeem.ejs');
});


app.route("/redeem")
    .post(async (req, res) => {
    session=req.session;
    if(!session.username){ 
        res.redirect("/"); 
        return;
    }
    
    let movie_title = req.body.movie_title;
   
    let user;
    try
    {
        user = await User.find({username: session.username});
        
        if(user[0].points >= 1)
        {
            await User.findOneAndUpdate({username: session.username}, {$inc : {points : -1}})
            
            const new_redeem = new Redeem(
                {
                    username: session.username,
                    movie: movie_title,
                    points:1
                })    

            await new_redeem.save();

            res.redirect("/home");
        }
        else{
            res.redirect("/home");
        }
    }
    catch(err){console.log(err)}
    

    }
)




// EDIT or Update
app
    .route("/edit/:id")
    .get(async (req,res) => {
        const id = req.params.id
        let tasks = await TodoTask.find();
        res.render('edit.ejs', {todoTasks:tasks, idTask:id})
    })
    .post(async (req, res) => {
        const id = req.params.id
        try
        {
            await TodoTask.findByIdAndUpdate(
            id,
            {
                title: req.body.title,
                content: req.body.content
            })
            res.redirect("/");
        }
        catch(err){console.log(err)}
    })

// Delete
app
    .route("/remove/:id")
    .get(async (req,res) => {
        const id = req.params.id
        await TodoTask.findByIdAndRemove(id);
        res.redirect("/");
    })

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

