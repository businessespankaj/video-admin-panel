// =========================
// FIREBASE IMPORTS
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// =========================
// FIREBASE CONFIG
// Apna Firebase config yahan paste karo
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyBbCj86V3dVMvaG-4Z1uINgRUJmDQju_MU",
  authDomain: "businesstg.firebaseapp.com",
  projectId: "businesstg",
  storageBucket: "businesstg.firebasestorage.app",
  messagingSenderId: "649136009298",
  appId: "1:649136009298:web:2edd9f1369e6fd56f3af8b"
};

// =========================
// CLOUDINARY SETTINGS
// Cloud Name dashboard se copy karo
// Upload Preset = video_thumbnails
// =========================
const CLOUDINARY_CLOUD_NAME = "dvoltkugq";
const CLOUDINARY_UPLOAD_PRESET = "video_thumbnails";

// =========================
// INITIALIZE
// =========================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =========================
// DOM ELEMENTS
// =========================
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

const logoutBtn = document.getElementById("logoutBtn");

const thumbnailFile = document.getElementById("thumbnailFile");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const priceInput = document.getElementById("price");
const fileLinkInput = document.getElementById("fileLink");
const saveBtn = document.getElementById("saveBtn");
const saveMessage = document.getElementById("saveMessage");

const videoList = document.getElementById("videoList");

// =========================
// LOGIN
// =========================
loginBtn.addEventListener("click", async () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  if (!email || !password) {
    loginMessage.textContent = "Email aur password required hai.";
    return;
  }

  loginMessage.textContent = "Logging in...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginMessage.textContent = "";
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

// =========================
// LOGOUT
// =========================
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// =========================
// AUTH STATE
// =========================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    await loadVideos();
  } else {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
  }
});

// =========================
// CLOUDINARY UPLOAD
// =========================
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const data = await response.json();

  if (!data.secure_url) {
    throw new Error("Image upload failed.");
  }

  return data.secure_url;
}

// =========================
// SAVE VIDEO
// =========================
saveBtn.addEventListener("click", async () => {
  try {
    const file = thumbnailFile.files[0];
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const price = Number(priceInput.value.trim());
    const fileLink = fileLinkInput.value.trim();

    if (!file || !title || !description || !price || !fileLink) {
      saveMessage.textContent = "Sabhi fields bharna zaroori hai.";
      return;
    }

    saveBtn.disabled = true;
    saveMessage.textContent = "Uploading image...";

    const thumbnail = await uploadImage(file);

    saveMessage.textContent = "Saving data...";

    await addDoc(collection(db, "videos"), {
      title,
      description,
      thumbnail,
      price,
      fileLink,
      status: "active",
      createdAt: serverTimestamp()
    });

    saveMessage.textContent = "Video successfully saved!";

    thumbnailFile.value = "";
    titleInput.value = "";
    descriptionInput.value = "";
    priceInput.value = "";
    fileLinkInput.value = "";

    await loadVideos();
  } catch (error) {
    console.error(error);
    saveMessage.textContent = error.message;
  } finally {
    saveBtn.disabled = false;
  }
});

// =========================
// LOAD VIDEOS
// =========================
async function loadVideos() {
  videoList.innerHTML = "Loading videos...";

  const q = query(
    collection(db, "videos"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    videoList.innerHTML = "<p>No videos found.</p>";
    return;
  }

  let html = "";

  snapshot.forEach((doc) => {
    const data = doc.data();

    html += `
      <div class="video-item">
        <img src="${data.thumbnail}" alt="${data.title}">
        <h3>${data.title}</h3>
        <p>${data.description}</p>
        <p><strong>₹${data.price}</strong></p>
        <p>
          <a href="${data.fileLink}" target="_blank" style="color:#4da3ff;">
            Open File Link
          </a>
        </p>
      </div>
    `;
  });

  videoList.innerHTML = html;
}
