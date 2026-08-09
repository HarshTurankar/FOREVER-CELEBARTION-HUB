// wedding_planner_app.js
import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import session from "express-session";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import harsh_db from './db.js';
import reels_db from './reel.js';
import mumbai_db from './mumbai.js';
import catring_db from './catring.js';
import musical_db from './musical.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import Razorpay from "razorpay";


dotenv.config();

const app = express();
const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/videos'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });


// ✅ Middleware
app.use(express.json());
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // CSS/JS काम करेंगे
app.use(cors());
app.use(cookieParser());

// ✅ Session setup — Auto Logout in 5 minutes
app.use(session({
  secret: 'wedding-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 5, // 5 मिनट auto logout
    httpOnly: true
  }
}));

// ✅ Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});



app.use('/videos', express.static(path.join(__dirname, 'public/videos')));

// ✅ Login Check Middleware (Token + Session verify)
function isLoggedIn(req, res, next) {
  const tokenFromCookie = req.cookies?.session_token;
  if (req.session?.user && tokenFromCookie === req.session?.token) {
    next();
  } else {
    res.redirect('/login');
  }
}

// ✅ Global Middleware — सिर्फ login/signup और assets allow
app.use((req, res, next) => {
  const openPaths = ['/login', '/signup', '/css', '/js', '/images', '/videos', '/favicon.ico'];
  if (openPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  const tokenFromCookie = req.cookies?.session_token;
  if (req.session?.user && tokenFromCookie === req.session?.token) {
    return next();
  }
  return res.redirect('/login');
});

// ✅ Create Razorpay Order API

app.get('/payment-success', (req, res) => {

  res.render('payment-success', {
    paymentId: 'PAY123456',
    orderId: 'ORD123456',
    paymentDate: new Date().toLocaleString('en-IN'),
    total: 100000,
    itemCount: 1,
    user: { name: 'Harsh' }
  });

});

app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    // Debug log
    console.log("📦 Creating Razorpay order for ₹", amount);

    const options = {
      amount: Number(amount) * 100, // Convert ₹ → paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);
    console.log("✅ Razorpay order created:", order.id);

    res.json(order);
  } catch (err) {
    console.error("❌ Error creating order:", err.response ? err.response.data : err);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
});


app.get('/bookings', async (req, res) => {

  const result = await mumbai_db.query(
    'SELECT * FROM bookings ORDER BY id DESC'
  );

  res.render('bookings', {
    bookings: result.rows
  });
});


// ✅ Payment Success Route

app.post('/payment-success', async (req, res) => {

  const cart = req.session.cart || [];

  const total = cart.reduce((sum, item) => {
    return sum + Number(item.price || 0);
  }, 0);

  const paymentId =
    'PAY' + Date.now() + Math.floor(Math.random() * 1000);

  const orderId =
    'ORD' + Date.now() + Math.floor(Math.random() * 1000);

  const paymentDate = new Date().toLocaleString('en-IN');

  await mumbai_db.query(
    `INSERT INTO bookings
     (user_name, payment_id, order_id, total_amount, item_count)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      req.session.user.name,
      paymentId,
      orderId,
      total,
      cart.length
    ]
  );

  res.render('payment-success', {
    paymentId,
    orderId,
    paymentDate,
    total,
    itemCount: cart.length,
    user: req.session.user
  });
});

// ===================== AUTH =====================
app.get("/", (req, res) => res.redirect("/login"));

app.get("/signup", (req, res) => res.render("signup.ejs"));
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    await harsh_db.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3)", [name, email, password]);
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.send("Signup failed.");
  }
});

app.get("/login", (req, res) => res.render("login.ejs"));

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await harsh_db.query("SELECT * FROM users WHERE email = $1 AND password = $2", [email, password]);
    if (result.rows.length > 0) {
      // ✅ unique session token बनाओ
      const sessionToken = crypto.randomBytes(16).toString("hex");
      req.session.user = result.rows[0];
      req.session.token = sessionToken;
      res.cookie("session_token", sessionToken, { httpOnly: true });
      res.redirect("/home");
    } else {
      res.send("Invalid login.");
    }
  } catch (err) {
    console.error(err);
    res.send("Login error.");
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("session_token");
  req.session.destroy(err => {
    if (err) console.error(err);
    res.redirect("/login");
  });
});

// ===================== PROTECTED ROUTES =====================
app.get("/home", isLoggedIn, (req, res) => res.render("home.ejs", { user: req.session.user }));

app.get('/reels', isLoggedIn, async (req, res) => {
  try {
    const result = await reels_db.query('SELECT * FROM reels ORDER BY created_at DESC');
    res.render('reels', { videoFiles: result.rows });
  } catch (err) {
    console.error("Error loading reels:", err);
    res.status(500).send("Reels DB Error");
  }
});

app.get('/upload-reel', isLoggedIn, (req, res) => res.render('upload_reel.ejs'));
app.post('/upload-reel', isLoggedIn, upload.single('video'), async (req, res) => {
  const { caption } = req.body;
  const videoPath = req.file.filename;
  try {
    await reels_db.query('INSERT INTO reels (video_path, caption) VALUES ($1, $2)', [videoPath, caption]);
    res.redirect('/reels');
  } catch (err) {
    console.error("Error uploading reel:", err);
    res.status(500).send("Upload Error");
  }
});

app.get('/payment', (req, res) => {
  const cart = req.session.cart || [];

  const total = cart.reduce((sum, item) => {
    return sum + Number(item.price || 0);
  }, 0);

  res.render('payment', { total });
});

app.get('/cart', (req, res) => {
  const cart = req.session.cart || [];

  const total = cart.reduce((sum, item) => {
    return sum + Number(item.price || 0);
  }, 0);

  res.render('cart', { cart, total });
});

app.post('/add-to-cart', isLoggedIn, (req, res) => {
  const { name, address, photo, rating, price } = req.body;

  if (!req.session.cart) req.session.cart = [];

  req.session.cart.push({
    name,
    address,
    photo,
    rating,
    price
  });

  res.redirect('/cart');
});

app.post('/remove-from-cart', (req, res) => {
const index = parseInt(req.body.index);

if (req.session.cart && index >= 0) {
req.session.cart.splice(index, 1);
}

res.redirect('/cart');
});



app.get('/profile', isLoggedIn, (req, res) => res.render('profile', { user: req.session.user }));
app.get('/invite', isLoggedIn, (req, res) => {
  const inviteLink = `http://localhost:3000/signup?ref=${req.session.user.id}`;
  res.render('invite', { user: req.session.user, inviteLink });
});

app.get('/feedback', isLoggedIn, (req, res) => res.render('feedback', { user: req.session.user }));
app.post('/feedback', isLoggedIn, (req, res) => {
  const { message } = req.body;
  const user = req.session.user;
  console.log(`Feedback from ${user.name}: ${message}`);
  res.render('thankyou', { user });
});

app.get('/help', isLoggedIn, (req, res) => res.render('help', { user: req.session.user }));
app.get('/setting', isLoggedIn, (req, res) => res.render('setting', { user: req.session.user }));

app.get('/saved-venues', isLoggedIn, (req, res) => {
  const user = req.session.user;
  const cart = req.session.cart || [];
  res.render('saved-venues', { user, cart });
});

app.get('/catering', isLoggedIn, async (req, res) => {
  try {
    const result = await catring_db.query('SELECT * FROM catering ORDER BY id ASC');
    res.render('catering-list', { cateringList: result.rows });
  } catch (err) {
    console.error('Error fetching catering list:', err);
    res.status(500).send('Database error');
  }
});

app.get('/catering/:id', isLoggedIn, async (req, res) => {
  try {
    const result = await catring_db.query('SELECT * FROM catering WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).send('Catering not found');
    res.render('catering-details', { caterer: result.rows[0] });
  } catch (err) {
    console.error('Error fetching catering details:', err);
    res.status(500).send('Database error');
  }
});

app.get('/musical', isLoggedIn, async (req, res) => {
  try {
    const result = await musical_db.query('SELECT * FROM musical ORDER BY id ASC');
    res.render('musical', { musicalList: result.rows });
  } catch (err) {
    console.error('Error fetching musical list:', err);
    res.status(500).send('Database error');
  }
});

// ===================== OTHER ROUTES =====================
app.get('/api/search-db', isLoggedIn, async (req, res) => {
  const { city } = req.query;
  try {
    const result = await mumbai_db.query(
      'SELECT * FROM public.banquet_halls WHERE LOWER(city) = LOWER($1) LIMIT 10',
      [city]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Database search error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/chat', isLoggedIn, (req, res) => {
  const userMessage = req.body.message;
  let reply = "Sorry, I didn't understand that.";
  if (userMessage.toLowerCase().includes("order")) {
      reply = "Sure! Can you share your order number?";
  } else if (userMessage.toLowerCase().includes("venue")) {
      reply = "We have many beautiful venues! Which city are you looking in?";
  } else if (userMessage.toLowerCase().includes("help")) {
      reply = "I'm here to help! Please ask me anything about bookings or services.";
  }
  res.json({ reply });
});

app.get('/details.html', isLoggedIn, (req, res) => {
  const { name, address, photo, rating } = req.query;
  res.render('details', { name, address, photo, rating });
});

app.get('/weddings.html', isLoggedIn, (req, res) => res.render('wedding.ejs'));
app.get('/Birthday.html', isLoggedIn, (req, res) => res.render('birthday.ejs'));
app.get('/Anniversaries.html', isLoggedIn, (req, res) => res.render('annverseries.ejs'));
app.get('/Festivals.html', isLoggedIn, (req, res) => res.render('festival.ejs'));
app.get('/custom-events.html', isLoggedIn, (req, res) => res.render('custom-events.ejs'));


//Anniverserisy 

app.get("/memories", (req, res) => {
    res.render("memories");
});

app.get("/packages", (req, res) => {
    res.render("packages");
});

app.get("/decor-gifts", (req, res) => {
    res.render("decor-gifts");
});

app.get("/romantic-ideas", (req, res) => {
    res.render("romantic-ideas");
});

// wedding 

app.get("/planning-tools", (req, res) => {
    res.render("planning-tools");
});


app.get("/wedding-packages", (req, res) => {
    res.render("wedding-packages");
});

app.get("/wedding-vendors", (req, res) => {
    res.render("wedding-vendors");
});

app.get("/bride", (req, res) => {
    res.render("bride");
});

// Birthday 

app.get("/party-tools", (req, res) => {
    res.render("party-tools");
});

app.get("/birthday-packages", (req, res) => {
    res.render("birthday-packages");
});

app.get("/party-vendors", (req, res) => {
    res.render("party-vendors");
});

app.get("/birthday-decor-gifts", (req, res) => {
    res.render("birthday-decor-gifts");
});

// festival

app.get("/festival-decor", (req, res) => {
    res.render("festival-decor");
});


app.get("/festival-packages", (req, res) => {
    res.render("festival-packages");
});

app.get("/cultural-shows", (req, res) => {
    res.render("cultural-shows");
});


app.get("/lighting-music", (req, res) => {
    res.render("lighting-music");
});


//Custome  events 

app.get("/corporate-events", (req, res) => {
    res.render("corporate-events");
});

app.get("/private-parties", (req, res) => {
    res.render("private-parties");
});

app.get("/custom-packages", (req, res) => {
    res.render("custom-packages");
});

app.get("/catering-music", (req, res) => {
    res.render("catering-music");
});


// 404
app.use((req, res) => {
  res.status(404).send('<h1>404 - Page Not Found</h1>');
});

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});
