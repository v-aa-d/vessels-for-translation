const title = document.querySelector(".title");
const titleText = title.dataset.text;
let charIndex = 0;

function typeTitle() {
  title.textContent = titleText.slice(0, charIndex);
  charIndex++;
  if (charIndex <= titleText.length) {
    setTimeout(typeTitle, 100);
  } else {
    charIndex = 0;
    setTimeout(typeTitle, 30000);
  }
}
typeTitle();

const cursorImg = document.getElementById("cursor-img");
const links = document.querySelectorAll(".links a[data-img]");

const offset = 20;

document.addEventListener("mousemove", (e) => {
  cursorImg.style.left = e.clientX + offset + "px";
  cursorImg.style.top = e.clientY + offset + "px";
});

links.forEach((link) => {
  link.addEventListener("mouseenter", () => {
    cursorImg.src = link.dataset.img;
    cursorImg.style.display = "block";
  });

  link.addEventListener("mouseleave", () => {
    cursorImg.style.display = "none";
  });
});
