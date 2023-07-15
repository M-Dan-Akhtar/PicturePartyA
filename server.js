// Declare variables
const express = require("express");
const app = express();
const PORT = 8000;
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
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
const poll = require("./models/poll");

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

    let username = req.body.username.toLowerCase();
    let password = req.body.password;
    let user_exist;
    let hash;
    let login_success = false;
    try{
        user_exist = await User.find({username:username});
        
        if(user_exist.length > 0)
        {
            hash = user_exist[0].password;

            if ((await comparePassword(password, hash)) == true) {
                login_success = true;
            }
        }
        
    }catch (err) {
        console.log("--------------------");
        console.log("Login Failed: Error finding user.");
        console.log("--------------------");
        console.log(err);
        console.log("--------------------");
        res.redirect("/home");
        return;
    }

    if (login_success) {
        session=req.session;
        session.username=username;
        console.log("Login Success: " + username);
        res.redirect("/home");
    } 
    else
    {
        res.render('login.ejs', {result: "Invalid username/password. Please try again."})
        console.log("Login Failed: " + username);
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
        res.redirect("/");
        //res.render("register.ejs")   registration disabled.

    } catch (err) {
        console.log(err)
    }
});

app.post('/register', async (req, res) => {

    let username = req.body.username.toLowerCase();
    let password = req.body.password;
    let user_exist;

    try{
        user_exist = await User.find({username:username});
    }
    catch(err)
    {
        console.log("--------------------");
        console.log("Register Failed: Error getting user_exist.");
        console.log("--------------------");
        console.log(err);
        console.log("--------------------");
    }

    if (user_exist[0] != null) {
        console.log(`Register Failed: "${username}" user already exists.`);
        res.render('register', {result: "User already exists."})
        return;
    } 
    
    password = await hashPassword(password);
    
    const new_user = new User(
        {
            username: username,
            password: password,
            points:0
        })    

    try {
        await new_user.save();
        console.log(`Register Success: "${username}" created.`);
        res.redirect("/");
    } catch (err) {
        console.log("--------------------");
        console.log("Register Failed: Error creating new_user.");
        console.log("--------------------");
        console.log(err);
        console.log("--------------------");
        res.redirect("/");
    }
});



//*******************************************
// Create Poll                              * 
//*******************************************   
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
        console.log("Poll Created: " + poll_title + " | " + poll_author);
        res.redirect("/home");
    } catch (err) {
        console.log("--------------------");
        console.log("Poll Failed: Error creating new_poll | " + poll_author);
        console.log("--------------------");
        console.log(err);
        console.log("--------------------");
        res.render("create_poll.ejs", {result: "Error: Fields weren't filled correctly."});
    }
});



//*******************************************
// Poll                                     * 
//*******************************************   
app
    .route("/poll/:id")
    .get(async (req,res) => {
        session=req.session;
        if(!session.username){ 
            res.redirect("/"); 
            return;
        }
        const username = session.username;
        const id = req.params.id
        let current_poll;
        try
        {
            current_poll = await Poll.find({_id:id});
        }
        catch(err){
            console.log("--------------------");
            console.log("Poll Failed: Error getting current_poll.");
            console.log("--------------------");
            console.log(err);
            console.log("--------------------");
        }
        if(current_poll.length > 0)
        {
            res.render('poll.ejs', {poll:current_poll[0]})
        }
        else
        {
            console.log(`Poll Failed: Poll doesn't exist. Accessed by ${username}.`);
            res.redirect("/home"); 
        }

    })
 

//*******************************************
// Add Movie                                * 
//*******************************************  
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
        console.log("Movie added: " + movie_title + " | " + session.username);
        res.redirect("/poll/" + id);
    }
    catch(err)
    {
        console.log("--------------------");
        console.log("Add Movie Failed: Error updating poll.");
        console.log("--------------------");
        console.log(err);
        console.log("--------------------");
    }
    }
)


//*******************************************
// Add Vote                                 * 
//*******************************************  
app.route("/add_vote/:poll_id/:movie_id")
    .get(async (req, res) => {
    session=req.session;
    if(!session.username){ 
        res.redirect("/"); 
        return;
    }
    
    const poll_id = req.params.poll_id 
    const movie_id = req.params.movie_id

    let username = session.username;
    let voted = false;
    let current_poll;
    let points_awarded = 5;
    let movie_title;

    try{
        current_poll = await Poll.find({_id:poll_id});
        for(let i = 0; i < current_poll[0].movies.length; ++i)
        {
            if(current_poll[0].movies[i]._id == movie_id)
            {
               movie_title = current_poll[0].movies[i].title;
            }
        }
    }
    catch(err)
    {
        console.log("--------------------");
        console.log("Add Vote Failed: Error finding poll.");
        console.log("--------------------");
        console.log(err);
        console.log("--------------------");
        res.redirect("/home");
        return;
    }

    // check if user has voted already
    for(let i = 0; i < current_poll[0].vote_list.length; ++i) {
        if(current_poll[0].vote_list[i].username == session.username) { voted = true } 
    }


    if(!voted){
        try
        {
            // add one vote to the movie and update vote_list with the user who voted
            await Poll.updateOne(
                { _id : poll_id, "movies._id" : movie_id},    
                { $inc: {"movies.$.votes" : 1}, $push : { vote_list: { username: session.username, voted_for: movie_title}}}
            )

            

            // person who added the movie gets points anytime someone votes for their movie
            for(let i = 0; i < current_poll[0].movies.length; ++i)
            {
                if(current_poll[0].movies[i]._id == movie_id)
                {
                    const added_by = current_poll[0].movies[i].added_by;
                    
                    if(added_by !== username)
                    {
                        await User.findOneAndUpdate({username: added_by}, {$inc : {points : points_awarded}})
                        await User.findOneAndUpdate({username: username}, {$inc : {points : points_awarded}})
                    }
                }
            }
            
            console.log("Vote added: " + movie_title + " | Poll: " + current_poll[0].poll_title + " | " + username);
            res.redirect("/poll/" + poll_id);
        }
        catch(err){
            console.log("--------------------");
            console.log("Add Vote Failed: Error updating votes.");
            console.log("--------------------");
            console.log(err);
            console.log("--------------------");
        }
    }
    else
    {
        res.redirect("/poll/" + poll_id);
    }
})


//*******************************************
// Close Poll                               * 
//*******************************************  

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
    let points_awarded = 10;
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
            //await User.findOneAndUpdate({username: winner}, {$inc : {points : points_awarded}})
        }

        res.redirect("/poll/" + poll_id);
    }
    catch(err){
        console.log("--------------------");
        console.log("Close Poll Failed");
        console.log("--------------------");
        console.log(err);
        console.log("--------------------");
    }
})


//*******************************************
// Redeem                                   * 
//*******************************************  

app.get('/redeem', async(req,res) => {
    session=req.session;
    if(!session.username){ 
        res.redirect("/"); 
        return;
    }

    let user;
    try
    {
        user = await User.find({username: session.username});

    }
    catch(err){console.log(err)}
    
    res.render('redeem.ejs', {points: user[0].points});
});


app.route("/redeem")
    .post(async (req, res) => {
    session=req.session;
    if(!session.username){ 
        res.redirect("/"); 
        return;
    }
    
    let movie_title = req.body.movie_title;
    let points_to_redeem = 100;
    let user;
    try
    {
        user = await User.find({username: session.username});
        
        if(user[0].points >= points_to_redeem)
        {
            await User.findOneAndUpdate({username: session.username}, {$inc : {points : -points_to_redeem}})
            
            const new_redeem = new Redeem(
                {
                    username: session.username,
                    movie: movie_title,
                    points:points_to_redeem
                })    

            await new_redeem.save();

            res.redirect("/home");
        }
        else{
            res.render("redeem.ejs", {points: user[0].points, result: "Error: Not enough points or field not filled."});
        }
    }
    catch(err){console.log(err)}

    }
)

//*******************************************
// Password Hashing bcrypt                  * 
//*******************************************  

function hashPassword(plainPassword) {
	return bcrypt.hash(plainPassword, 10);
}

function comparePassword(plainPassword, hash) {
	return bcrypt.compare(plainPassword, hash);
}



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

