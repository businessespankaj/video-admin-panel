import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// =========================
// FIREBASE CONFIG
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyBbCj86V3dVMvaG-4Z1uINgRUJmDQju_MU",
  authDomain: "businesstg.firebaseapp.com",
  projectId: "businesstg",
  storageBucket: "businesstg.firebasestorage.app",
  messagingSenderId: "649136009298",
  appId: "1:649136009298:web:2edd9f1369e6fd56f3af8b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Auth persistence error:", err);
});

// =========================
// CLOUDINARY CONFIG
// =========================
const CLOUDINARY_CLOUD_NAME = "YOUR_CLOUD_NAME";
const CLOUDINARY_UPLOAD_PRESET = "video_thumbnails";

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

// Optional field; works if you add it later
const statusInput = document.getElementById("status");

// =========================
// STATE
// =========================
let editingId = null;
let currentThumbnailUrl = "";
let videosUnsubscribe = null;

// =========================
// HELPERS
// =========================
function showLogin() {
  if (loginSection) loginSection.classList.remove("hidden");
  if (dashboardSection) dashboardSection.classList.add("hidden");
}

function showDashboard() {
  if (loginSection) loginSection.classList.add("hidden");
  if (dashboardSection) dashboardSection.classList.remove("hidden");
}

function resetVideoForm() {
  editingId = null;
  currentThumbnailUrl = "";
  if (titleInput) titleInput.value = "";
  if (descriptionInput) descriptionInput.value = "";
  if (priceInput) priceInput.value = "";
  if (fileLinkInput) fileLinkInput.value = "";
  if (statusInput) statusInput.value = "active";
  if (thumbnailFile) thumbnailFile.value = "";
  if (saveBtn) saveBtn.textContent = "Save Video";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function uploadThumbnail(file) {
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

  if (!response.ok || !data.secure_url) {
    const msg = data?.error?.message || "Image upload failed.";
    throw new Error(msg);
  }

  return data.secure_url;
}

function toggleMenu(id) {
  document.querySelectorAll('[id^="menu-"]').forEach((menu) => {
    if (menu.id !== `menu-${id}`) {
      menu.style.display = "none";
    }
  });

  const menu = document.getElementById(`menu-${id}`);
  if (!menu) return;

  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

async function editVideo(id) {
  try {
    const snap = await getDoc(doc(db, "videos", id));

    if (!snap.exists()) {
      alert("Video not found.");
      return;
    }

    const data = snap.data();

    editingId = id;
    currentThumbnailUrl = data.thumbnail || "";

    if (titleInput) titleInput.value = data.title || "";
    if (descriptionInput) descriptionInput.value = data.description || "";
    if (priceInput) priceInput.value = data.price || "";
    if (fileLinkInput) fileLinkInput.value = data.fileLink || "";
    if (statusInput) statusInput.value = data.status || "active";
    if (thumbnailFile) thumbnailFile.value = "";

    if (saveBtn) saveBtn.textContent = "Update Video";

    if (saveMessage) {
      saveMessage.textContent = "Edit mode active. New thumbnail file optional.";
    }

    if (dashboardSection) {
      dashboardSection.scrollIntoView({ behavior: "smooth" });
    }
  } catch (error) {
    console.error(error);
    alert("Error: " + error.message);
  }
}

async function deleteVideo(id) {
  const confirmed = confirm(
    "Are you sure you want to delete this video?\n\nOK = Delete\nCancel = Keep it"
  );

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "videos", id));
    alert("Video deleted successfully!");

    if (editingId === id) {
      resetVideoForm();
      if (saveMessage) saveMessage.textContent = "";
    }
  } catch (error) {
    console.error(error);
    alert("Error: " + error.message);
  }
}

async function shareVideo(url) {
  try {
    if (navigator.share) {
      await navigator.share({ url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!\n\n" + url);
    }
  } catch (error) {
    console.error(error);
  }
}

function openSharedVideo() {
  const params = new URLSearchParams(window.location.search);
  const videoId = params.get("video");

  if (!videoId) return;

  setTimeout(() => {
    const cards = document.querySelectorAll(".video-card");

    for (const card of cards) {
      if (card.dataset.videoId === videoId) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.style.outline = "3px solid #4CAF50";
        card.style.borderRadius = "12px";

        setTimeout(() => {
          card.style.outline = "";
        }, 4000);

        break;
      }
    }
  }, 300);
}

function startVideoListener() {
  if (videosUnsubscribe) return;

  const q = query(collection(db, "videos"), orderBy("createdAt", "desc"));

  videosUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (!videoList) return;
      videoList.innerHTML = "";

      if (snapshot.empty) {
        videoList.innerHTML = "<p>No videos found.</p>";
        openSharedVideo();
        return;
      }

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        const shareUrl = `${window.location.origin}${window.location.pathname}?video=${encodeURIComponent(id)}`;

        const card = document.createElement("div");
        card.className = "video-card";
        card.dataset.videoId = id;

        card.innerHTML = `
          <div class="card-menu-wrapper" style="position:relative;text-align:right;">
            <button type="button"
        onclick="window.toggleMenu(${JSON.stringify(id)})"
                    style="background:none;border:none;font-size:28px;cursor:pointer;">
              ⋮
            </button>

            <div id="menu-${id}"
                 style="display:none;position:absolute;right:0;top:35px;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:999;min-width:140px;overflow:hidden;">

              <button type="button"
                      onclick="window.editVideo(${JSON.stringify(id)})"
                      style="display:block;width:100%;padding:10px;border:none;background:none;text-align:left;cursor:pointer;">
                ✏️ Edit
              </button>

              <button type="button"
                      onclick="window.deleteVideo(${JSON.stringify(id)})"
                      style="display:block;width:100%;padding:10px;border:none;background:none;text-align:left;color:red;cursor:pointer;">
                🗑️ Delete
              </button>

              <button type="button"
                      onclick="window.shareVideo(${JSON.stringify(shareUrl)})"
                      style="display:block;width:100%;padding:10px;border:none;background:none;text-align:left;cursor:pointer;">
                🔗 Share
              </button>
            </div>
          </div>

          <img src="${escapeHtml(data.thumbnail)}"
               alt="${escapeHtml(data.title)}"
               style="width:100%;max-width:300px;border-radius:12px;display:block;">

          <h3>${escapeHtml(data.title)}</h3>
          <p>${escapeHtml(data.description)}</p>
          <p><strong>₹${data.price} only</strong></p>
          <p><small>Status: ${escapeHtml(data.status || "active")}</small></p>
        `;

        videoList.appendChild(card);
      });

      openSharedVideo();
    },
    (error) => {
      console.error("Video listener error:", error);
      if (videoList) {
        videoList.innerHTML = `<p>Error loading videos: ${escapeHtml(error.message)}</p>`;
      }
    }
  );
}

// Expose inline handlers for the generated cards
window.toggleMenu = toggleMenu;
window.editVideo = editVideo;
window.deleteVideo = deleteVideo;
window.shareVideo = shareVideo;

// =========================
// LOGIN
// =========================
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = loginEmail?.value.trim();
    const password = loginPassword?.value.trim();

    if (!email || !password) {
      if (loginMessage) loginMessage.textContent = "Please enter email and password.";
      return;
    }

    try {
      if (loginMessage) loginMessage.textContent = "Logging in...";
      await signInWithEmailAndPassword(auth, email, password);
      if (loginMessage) loginMessage.textContent = "";
    } catch (error) {
      if (loginMessage) loginMessage.textContent = error.message;
      console.error(error);
    }
  });
}

// =========================
// LOGOUT
// =========================
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      resetVideoForm();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  });
}

// =========================
// SAVE OR UPDATE VIDEO
// =========================
if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    try {
      if (!auth.currentUser) {
        alert("Pehle login karo.");
        return;
      }

      const title = titleInput?.value.trim();
      const description = descriptionInput?.value.trim();
      const price = Number(priceInput?.value);
      const fileLink = fileLinkInput?.value.trim();
      const status = statusInput ? statusInput.value : "active";
      const file = thumbnailFile?.files?.[0];

      if (!title || !description || !price || !fileLink) {
        if (saveMessage) saveMessage.textContent = "Sabhi fields bharna zaroori hai.";
        return;
      }

      if (saveBtn) saveBtn.disabled = true;
      if (saveMessage) saveMessage.textContent = "Saving...";

      let thumbnail = currentThumbnailUrl;

      if (file) {
        if (saveMessage) saveMessage.textContent = "Uploading image...";
        thumbnail = await uploadThumbnail(file);
      }

      if (!thumbnail) {
        if (saveMessage) saveMessage.textContent = "Thumbnail file required hai.";
        if (saveBtn) saveBtn.disabled = false;
        return;
      }

      const videoData = {
        title,
        description,
        thumbnail,
        price,
        fileLink,
        status,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, "videos", editingId), videoData);
        if (saveMessage) saveMessage.textContent = "Video updated successfully!";
      } else {
        videoData.createdAt = serverTimestamp();
        await addDoc(collection(db, "videos"), videoData);
        if (saveMessage) saveMessage.textContent = "Video uploaded successfully!";
      }

      resetVideoForm();
    } catch (error) {
      console.error(error);
      if (saveMessage) saveMessage.textContent = "Error: " + error.message;
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });
}

// =========================
// AUTH STATE
// =========================
onAuthStateChanged(auth, (user) => {
  if (user) {
    showDashboard();
    startVideoListener();
    if (saveMessage && !saveMessage.textContent) {
      saveMessage.textContent = "";
    }
  } else {
    showLogin();
    if (videosUnsubscribe) {
      videosUnsubscribe();
      videosUnsubscribe = null;
    }
  }
});
// =========================
// EXPOSE FUNCTIONS TO HTML
// =========================
window.toggleMenu = toggleMenu;
window.editVideo = editVideo;
window.deleteVideo = deleteVideo;
window.shareVideo = shareVideo;
