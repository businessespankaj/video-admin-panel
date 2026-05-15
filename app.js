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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// =========================
// GLOBAL VARIABLES
// =========================
let editingId = null;

// =========================
// DOM ELEMENTS
// =========================
const form = document.getElementById("videoForm");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const thumbnailInput = document.getElementById("thumbnail");
const priceInput = document.getElementById("price");
const fileLinkInput = document.getElementById("fileLink");
const statusInput = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const videoList = document.getElementById("videoList");

// =========================
// SAVE OR UPDATE VIDEO
// =========================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const videoData = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    thumbnail: thumbnailInput.value.trim(),
    price: Number(priceInput.value),
    fileLink: fileLinkInput.value.trim(),
    status: statusInput.value,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (editingId) {
      // UPDATE EXISTING VIDEO
      await db.collection("videos").doc(editingId).update(videoData);
      alert("Video updated successfully!");
      editingId = null;
      submitBtn.textContent = "Save Video";
    } else {
      // CREATE NEW VIDEO
      videoData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("videos").add(videoData);
      alert("Video uploaded successfully!");
    }

    form.reset();
  } catch (error) {
    console.error(error);
    alert("Error: " + error.message);
  }
});

// =========================
// LOAD VIDEOS
// =========================
db.collection("videos")
  .orderBy("createdAt", "desc")
  .onSnapshot((snapshot) => {
    videoList.innerHTML = "";

    snapshot.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;

      const shareUrl = `${window.location.origin}${window.location.pathname}?video=${id}`;

      const card = document.createElement("div");
      card.className = "video-card";

      card.innerHTML = `
        <div class="card-menu-wrapper" style="position:relative;text-align:right;">
          <button onclick="toggleMenu('${id}')"
                  style="background:none;border:none;font-size:28px;cursor:pointer;">
            ⋮
          </button>

          <div id="menu-${id}"
               style="display:none;position:absolute;right:0;top:35px;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:999;min-width:140px;">

            <button onclick="editVideo('${id}')"
                    style="display:block;width:100%;padding:10px;border:none;background:none;text-align:left;cursor:pointer;">
              ✏️ Edit
            </button>

            <button onclick="deleteVideo('${id}')"
                    style="display:block;width:100%;padding:10px;border:none;background:none;text-align:left;color:red;cursor:pointer;">
              🗑️ Delete
            </button>

            <button onclick="shareVideo('${shareUrl}')"
                    style="display:block;width:100%;padding:10px;border:none;background:none;text-align:left;cursor:pointer;">
              🔗 Share
            </button>
          </div>
        </div>

        <img src="${data.thumbnail}" alt="${escapeHtml(data.title)}"
             style="width:100%;max-width:300px;border-radius:12px;">

        <h3>${escapeHtml(data.title)}</h3>
        <p>${escapeHtml(data.description)}</p>
        <p><strong>₹${data.price} only</strong></p>
        <p><small>Status: ${escapeHtml(data.status || 'active')}</small></p>
      `;

      videoList.appendChild(card);
    });

    // Agar URL me ?video=ID hai to us post par auto-scroll
    openSharedVideo();
  });

// =========================
// TOGGLE 3-DOTS MENU
// =========================
function toggleMenu(id) {
  document.querySelectorAll('[id^="menu-"]').forEach(menu => {
    if (menu.id !== `menu-${id}`) {
      menu.style.display = 'none';
    }
  });

  const menu = document.getElementById(`menu-${id}`);
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// Close menu when clicking outside
window.addEventListener('click', function(e) {
  if (!e.target.closest('.card-menu-wrapper')) {
    document.querySelectorAll('[id^="menu-"]').forEach(menu => {
      menu.style.display = 'none';
    });
  }
});

// =========================
// EDIT VIDEO
// =========================
async function editVideo(id) {
  try {
    const doc = await db.collection("videos").doc(id).get();

    if (!doc.exists) {
      alert("Video not found.");
      return;
    }

    const data = doc.data();

    titleInput.value = data.title || "";
    descriptionInput.value = data.description || "";
    thumbnailInput.value = data.thumbnail || "";
    priceInput.value = data.price || "";
    fileLinkInput.value = data.fileLink || "";
    statusInput.value = data.status || "active";

    editingId = id;
    submitBtn.textContent = "Update Video";

    form.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error(error);
    alert("Error: " + error.message);
  }
}

// =========================
// DELETE VIDEO
// =========================
async function deleteVideo(id) {
  const confirmed = confirm("Are you sure you want to delete this video?");

  if (!confirmed) return;

  try {
    await db.collection("videos").doc(id).delete();
    alert("Video deleted successfully!");

    if (editingId === id) {
      editingId = null;
      form.reset();
      submitBtn.textContent = "Save Video";
    }
  } catch (error) {
    console.error(error);
    alert("Error: " + error.message);
  }
}

// =========================
// SHARE VIDEO
// =========================
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

// =========================
// OPEN SHARED VIDEO
// =========================
function openSharedVideo() {
  const params = new URLSearchParams(window.location.search);
  const videoId = params.get('video');

  if (!videoId) return;

  setTimeout(() => {
    const menus = document.querySelectorAll('[id^="menu-"]');

    for (const menu of menus) {
      const id = menu.id.replace('menu-', '');

      if (id === videoId) {
        const card = menu.closest('.video-card');

        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.outline = '3px solid #4CAF50';
          card.style.borderRadius = '12px';

          setTimeout(() => {
            card.style.outline = '';
          }, 5000);
        }

        break;
      }
    }
  }, 1000);
}

// =========================
// HTML ESCAPE (Security)
// =========================
function escapeHtml(text) {
  if (!text) return '';

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
        }
// =========================
// ADMIN LOGIN SYSTEM
// =========================
function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  // Apna username aur password yahan set karo
  const ADMIN_USERNAME = "9090@gmail.com";
  const ADMIN_PASSWORD = "9090";

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Login success
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("adminPanel").style.display = "block";

    // Browser me login remember rakho
    localStorage.setItem("adminLoggedIn", "true");
  } else {
    alert("Invalid username or password");
  }
}

// Page load par check karo
window.addEventListener("load", function () {
  if (localStorage.getItem("adminLoggedIn") === "true") {
    const loginSection = document.getElementById("loginSection");
    const adminPanel = document.getElementById("adminPanel");

    if (loginSection) loginSection.style.display = "none";
    if (adminPanel) adminPanel.style.display = "block";
  }
});

// Logout function
function logout() {
  localStorage.removeItem("adminLoggedIn");
  location.reload();
}
