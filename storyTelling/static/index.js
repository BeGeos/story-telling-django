const header = document.getElementsByTagName("header")[0];
const mainContainer = document.querySelector(".main__container");
const homeSection = document.getElementById("home-section");

let ORDER = window.sessionStorage.getItem("order") || "created_at";

// Animation full navbar background
function animateNavbar(entries, observer) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      header.classList.add("full");
    } else {
      header.classList.remove("full");
    }
  });
}

if (homeSection) {
  // JS for home section
  const STORY_API_URL = "/api/story";
  let DATA_OFFSET = 0;
  let STORIES = {};

  const cardGrid = document.querySelector(".card__grid");

  let options = {
    rootMargin: "-100px",
    threshold: 0,
  };

  let observer = new IntersectionObserver(animateNavbar, options);

  observer.observe(mainContainer);

  const addStoryBtn = document.getElementById("add-story-btn");
  const closeAddStoryBtn = document.getElementById("close-add-story");
  const closeUpdateBtn = document.getElementById("close-update-story");

  // Open Add modal
  function openAdd() {
    document.querySelector(".add-story").classList.add("open");
  }

  // Close Add modal
  function closeAdd() {
    document.querySelector(".add-story").classList.remove("open");
  }

  // Open Update modal
  function openUpdate() {
    document.querySelector(".update-story").classList.add("open");
  }

  // Close Update modal
  function closeUpdate() {
    document.querySelector(".update-story").classList.remove("open");
  }

  // request to API to fetch stories
  // limit 10 at a time
  async function fetchStories() {
    try {
      let url = `${STORY_API_URL}?limit=10&offset=${DATA_OFFSET}&order=${ORDER}`;
      let stories = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      let data = await stories.json();
      DATA_OFFSET += data.meta.count;
      STORIES = data;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  function displayStoryOnPage() {
    if (Object.keys(STORIES).length > 0) {
      // STORIES is not empty
      for (let story of STORIES.stories) {
        let aLink = document.createElement("a");
        aLink.classList.add("card__link");
        aLink.href = `/story/${story.slug}`;

        // Card div
        let card = document.createElement("div");
        card.classList.add("card");

        // Card header
        let cardHeader = document.createElement("div");
        cardHeader.classList.add("card__header");
        // Story title
        let title = document.createElement("h2");
        title.textContent = story.title;
        cardHeader.appendChild(title);
        // Update Button
        if (STORIES.auth == 1) {
          let update = document.createElement("button");
          update.classList.add("update");
          update.setAttribute("dataset", story.slug);
          cardHeader.appendChild(update);
        }
        // Story snippet
        let snippet = document.createElement("p");
        snippet.classList.add("card__snippet");
        snippet.textContent = story.headline;
        // Story summary
        let preview = document.createElement("div");
        preview.classList.add("text__preview");
        let previewText = document.createElement("p");
        previewText.textContent = story.content.slice(0, 100) + "...";
        preview.appendChild(previewText);

        // append to card
        card.appendChild(cardHeader);
        card.appendChild(snippet);
        card.appendChild(preview);

        aLink.appendChild(card);

        // append to card grid
        cardGrid.appendChild(aLink);
      }
    }
  }

  // Open add story modal
  if (addStoryBtn) {
    addStoryBtn.addEventListener("click", (e) => {
      closeUpdate();
      openAdd();
    });

    // Close Add event
    closeAddStoryBtn.addEventListener("click", (e) => {
      closeAdd();
    });
  }

  // Update story form
  const updateStoryForm = document.querySelector(".update-story__form");

  // Event to update story
  updateStoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    let slug = updateStoryForm.getAttribute("dataset");
    let data = new FormData(updateStoryForm);
    let body = {
      title: data.get("update-title"),
      headline: data.get("update-first-line"),
      content: data.get("update-story-content"),
      image_url: data.get("update-image-url"),
    };
    // CSRF policy
    const csrftoken = document.querySelector(
      "[name=csrfmiddlewaretoken]"
    ).value;
    try {
      let request = await fetch(`${STORY_API_URL}/${slug}`, {
        method: "put",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify(body),
      });

      if (request.status == 200) {
        closeUpdate();
        DATA_OFFSET = 0;
        await fetchStories();
        cardGrid.innerHTML = "";
        displayStoryOnPage();
        return;
      }
      let response = await request.json();
      throw new Error(response.message || "No content");
    } catch (err) {
      console.error(err);
      return;
    }
  });

  // Delete story
  async function deleteStory(slug) {
    let deleteUrl = `${STORY_API_URL}/${slug}`;
    // CSRF policy
    const csrftoken = document.querySelector(
      "[name=csrfmiddlewaretoken]"
    ).value;
    try {
      let deleteRequest = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
      });

      return deleteRequest;
    } catch (err) {
      console.error(err);
      return;
    }
  }

  // Delete story button in update form
  const deleteStoryBtn = document.getElementById("delete-story");

  deleteStoryBtn.addEventListener("click", async (e) => {
    let slug = updateStoryForm.getAttribute("dataset");
    try {
      let deleteRequest = await deleteStory(slug);
      if (deleteRequest.status < 400) {
        closeUpdate();
        DATA_OFFSET = 0;
        await fetchStories();
        cardGrid.innerHTML = "";
        displayStoryOnPage();
        return;
      }
      throw new Error("delete incomplete");
    } catch (err) {
      console.error(err);
      return;
    }
  });

  // Fetch request to update data form
  async function fillUpdateForm(slug) {
    let url = `${STORY_API_URL}/${slug}`;
    try {
      let request = await fetch(url);
      let response = await request.json();
      if (request.status == 200) {
        // Populate form
        updateStoryForm.setAttribute("dataset", slug);
        document.getElementById("update-title").value = response.title;
        document.getElementById("update-first-line").value = response.headline;
        document.getElementById("update-story-content").value =
          response.rich_content;
        document.getElementById("update-image-url").value = response.image_url;
        return true;
      }
      throw new Error(response.message);
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  // Event for update btns on cards --> APIs async loading
  document.addEventListener("click", async (e) => {
    if (
      e.target.matches("button") &&
      e.target.getAttribute("class") == "update"
    ) {
      e.preventDefault();
      closeAdd();
      openUpdate();
      // Fill form with data
      await fillUpdateForm(e.target.getAttribute("dataset"));
    }
  });

  // Close update
  closeUpdateBtn.addEventListener("click", (e) => {
    closeUpdate();
  });

  // Add story form action
  const addStoryForm = document.querySelector(".add-story__form");

  addStoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    // Error handling
    const error = document.querySelector(".error");
    const errorMessage = document.getElementById("add-story-error");
    const closeError = document.getElementById("close-error");
    closeError.addEventListener("click", (e) => {
      errorMessage.innerHTML = "";
      error.classList.remove("on");
    });

    // Send post request to API
    let data = new FormData(addStoryForm);
    let body = {
      title: data.get("title"),
      headline: data.get("first-line"),
      image_url: data.get("image-url"),
      content: data.get("content"),
    };
    // CSRF policy
    const csrftoken = document.querySelector(
      "[name=csrfmiddlewaretoken]"
    ).value;
    // POST request to api for creating new story
    try {
      let request = await fetch(STORY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        mode: "same-origin",
        body: JSON.stringify(body),
      });

      if (request.status == 201) {
        document.querySelector(".add-story").style.animation =
          "fadeOut 0.5s linear forwards";

        setTimeout(() => {
          document.querySelector(".add-story").classList.remove("open");
        }, 600);
        DATA_OFFSET = 0;
        await fetchStories();
        cardGrid.innerHTML = "";
        displayStoryOnPage();
        addStoryForm.reset();
        return;
      }
      let response = await request.json();
      throw new Error(response.message || response.details);
    } catch (err) {
      console.error(err);
      errorMessage.innerHTML = err;
      error.classList.add("on");
    }
  });

  // Choose ordering of stories
  const latestBtn = document.getElementById("latest");
  const mostLikedBtn = document.getElementById("most-liked");
  const mostReadBtn = document.getElementById("most-read");

  // Activate btn
  function activateBtn(btn) {
    return btn.classList.add("active");
  }

  // Deactivate button
  function deactivateBtn() {
    return mainContainer
      .querySelector(".selection")
      .querySelector(".active")
      .classList.remove("active");
  }

  latestBtn.addEventListener("click", async (e) => {
    if (ORDER == "created_at") {
      // If trying to fetch same don't do anything
      return;
    }
    deactivateBtn();
    activateBtn(e.target);
    window.sessionStorage.setItem("order", "created_at");
    DATA_OFFSET = 0;
    ORDER = "created_at";
    await fetchStories();
    cardGrid.innerHTML = "";
    displayStoryOnPage();
  });

  mostLikedBtn.addEventListener("click", async (e) => {
    if (ORDER == "likes") {
      // If trying to fetch same don't do anything
      return;
    }
    deactivateBtn();
    activateBtn(e.target);
    window.sessionStorage.setItem("order", "likes");
    DATA_OFFSET = 0;
    ORDER = "likes";
    await fetchStories();
    cardGrid.innerHTML = "";
    displayStoryOnPage();
  });

  mostReadBtn.addEventListener("click", async (e) => {
    if (ORDER == "views") {
      // If trying to fetch same don't do anything
      return;
    }
    deactivateBtn();
    activateBtn(e.target);
    window.sessionStorage.setItem("order", "views");
    DATA_OFFSET = 0;
    ORDER = "views";
    await fetchStories();
    cardGrid.innerHTML = "";
    displayStoryOnPage();
  });

  window.addEventListener("DOMContentLoaded", async (e) => {
    await fetchStories();
    displayStoryOnPage();

    switch (ORDER) {
      case "created_at":
        latestBtn.classList.add("active");
        break;
      case "likes":
        mostLikedBtn.classList.add("active");
        break;
      case "views":
        mostReadBtn.classList.add("active");
        break;
    }
  });
}

// Global for all pages --> make stars background
class Star {
  constructor(bounds) {
    this.bounds = bounds;
    this.x = Math.floor(Math.random() * this.bounds[0]);
    this.y = Math.floor(Math.random() * this.bounds[1]);
    this.size = Math.floor(Math.random() * 3 + 3);
    this.opacity = Math.random();
  }
}

function makeStars() {
  const numOfStars = 300;
  const xBoundary = window.innerWidth;
  const yBoundary = document.body.scrollHeight;

  const starOne = document.createElement("div");
  starOne.setAttribute("id", "starOne");
  const starTwo = document.createElement("div");
  starTwo.setAttribute("id", "starTwo");

  for (let i = 0; i < numOfStars; i++) {
    let star = new Star([xBoundary, yBoundary]);
    let starDiv = document.createElement("div");
    starDiv.classList.add("star");
    starDiv.style.width = `${star.size}px`;
    starDiv.style.height = `${star.size}px`;
    starDiv.style.left = `${star.x}px`;
    starDiv.style.top = `${star.y}px`;
    // starDiv.style.backgroundColor = "blue";
    starDiv.style.opacity = `${star.opacity}`;

    // Append star to the starOne
    starOne.appendChild(starDiv);
  }
  document.body.appendChild(starOne);

  for (let i = 0; i < numOfStars; i++) {
    let star = new Star([xBoundary, yBoundary]);
    let starDiv = document.createElement("div");
    starDiv.classList.add("star");
    starDiv.style.width = `${star.size}px`;
    starDiv.style.height = `${star.size}px`;
    starDiv.style.left = `${star.x}px`;
    starDiv.style.top = `${star.y}px`;
    // starDiv.style.backgroundColor = "red";
    starDiv.style.opacity = `${star.opacity}`;

    // Append star to the starTwo
    starTwo.appendChild(starDiv);
  }
  document.body.appendChild(starTwo);
}

// setTimeout(() => makeStars(), 1000);

// Select story section

function likedAnimation(target) {
  let newHeart = document.createElement("div");
  newHeart.classList.add("fas");
  newHeart.classList.add("fa-heart");
  newHeart.classList.add("heart-animation");
  target.appendChild(newHeart);

  setTimeout(() => {
    newHeart.remove();
  }, 2500);
}

const storySection = document.getElementById("story-section");

if (storySection) {
  const likeBtn = document.getElementById("like-btn");
  const STORY_API_URL = "/api/story";
  const target = window.location.pathname.split("/")[2];

  function updateLikeToStory(num = 1) {
    const likes = document.getElementById("likes");
    let newLikes = parseInt(likes.textContent) + num;
    return (likes.textContent = newLikes);
  }

  likeBtn.addEventListener("click", async (e) => {
    let clicked = e.target.getAttribute("data-clicked");
    // console.log(target)
    let likeUrl = `${STORY_API_URL}/like/${target}`;
    let unlikeUrl = `${STORY_API_URL}/unlike/${target}`;
    let request;
    // CSRF policy
    const csrftoken = document.querySelector(
      "[name=csrfmiddlewaretoken]"
    ).value;

    try {
      if (clicked == "") {
        e.target.removeAttribute("data-clicked");
        e.target.classList.remove("red");

        // Send unlike to API
        request = await fetch(unlikeUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
        });
        if (request && request.status == 200) {
          return updateLikeToStory(-1);
        }
      } else {
        e.target.setAttribute("data-clicked", "");
        e.target.classList.add("red");

        // Add div for animation and fade out
        likedAnimation(e.target);

        // Send like to API
        request = await fetch(likeUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
        });
        if (request && request.status == 200) {
          return updateLikeToStory(1);
        }
      }
    } catch (err) {
      console.error(err);
      return;
    }
  });

  async function addViews() {
    let viewUrl = `${STORY_API_URL}/view/${target}`;
    // CSRF policy
    const csrftoken = document.querySelector(
      "[name=csrfmiddlewaretoken]"
    ).value;
    try {
      let request = await fetch(viewUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
      });
      if (request.status == 200) {
        console.log("viewed");
        return;
      }
      console.log(request.status);
    } catch (err) {
      console.error(err);
      return;
    }
  }

  // Send read input to backend
  window.addEventListener("DOMContentLoaded", (e) => {
    setTimeout(addViews, 3000);
  });
}

// Login Page Actions

const loginForm = document.getElementById("login__form");

if (loginForm) {
  const closeErrorBtn = document.getElementById("close-error");
  const error = document.querySelector(".error");

  if (closeErrorBtn) {
    closeErrorBtn.addEventListener("click", (e) => {
      error.classList.remove("on");
    });
  }
}

const writeSection = document.getElementById("write-section");

if (writeSection) {
  // JS for the write section
  const INSTRUCTION_API_URL = "/api/instruction";
  const WRITE_STORY_API_URL = "/api/write-a-story";
  const UPVOTE_INSTRUCTION_URL = "/api/instruction/like/";
  const DOWNVOTE_INSTRUCTION_URL = "/api/instruction/unlike/";
  const addInstructionForm = writeSection.querySelector(".assignment-form");
  const assignmentContainer = document.querySelector(".assignments-container");
  const mainContainer = document.querySelector(".main__container");
  let INSTRUCTIONS = {};

  let options = {
    rootMargin: "-100px",
    threshold: 0,
  };

  let observer = new IntersectionObserver(animateNavbar, options);

  observer.observe(mainContainer);

  async function fetchInstructions() {
    try {
      let request = await fetch(INSTRUCTION_API_URL);
      let response = await request.json();
      if (request.status == 200) {
        INSTRUCTIONS = response;
        return;
      }
      throw new Error(response.message);
    } catch (err) {
      console.error(err);
      return;
    }
  }

  function createInstructionElement(instruction) {
    let assignment = document.createElement("div");
    assignment.classList.add("assignment");
    let assignmentText = document.createElement("div");
    assignmentText.classList.add("assignment-text");
    assignmentText.textContent = instruction.text;
    assignment.appendChild(assignmentText);
    assignment.setAttribute("dataset", instruction.slug);
    assignment.setAttribute("datatext", instruction.text);

    // Up/down votes or minus
    if (INSTRUCTIONS.auth == 1) {
      let deleteAssignment = document.createElement("span");
      deleteAssignment.classList.add("remove-assignment");
      deleteAssignment.innerHTML = "&minus;";
      let privateAssignmentStats = document.createElement("div");
      privateAssignmentStats.classList.add("assignment-stats");
      privateAssignmentStats.innerHTML = `<span>Up Votes: ${instruction.up_votes}</span><span>Down Votes: ${instruction.down_votes}</span>`;
      assignmentText.appendChild(privateAssignmentStats);
      assignment.appendChild(deleteAssignment);
    } else {
      // like <i class="fas fa-thumbs-up"></i>
      // dislike <i class="fas fa-thumbs-down"></i>
      let votesAction = document.createElement("div");
      votesAction.classList.add("vote-action");
      let likeDislike = `
            <i class="fas fa-thumbs-up" class="like-btn"></i>
            <i class="fas fa-thumbs-down" class="dislike-btn"></i>
            `;
      votesAction.innerHTML = likeDislike;
      assignment.appendChild(votesAction);
    }
    return assignment;
  }

  async function displayInstructions() {
    try {
      // Populate instruction object
      await fetchInstructions();
      if (Object.keys(INSTRUCTIONS).length > 0) {
        assignmentContainer.innerHTML = "";
        for (let instruction of INSTRUCTIONS.instructions) {
          let assignment = createInstructionElement(instruction);
          // append to list
          assignmentContainer.appendChild(assignment);
        }
      }
    } catch (err) {
      console.error(err);
      return;
    }
  }

  displayInstructions();

  // Display single imstruction addition --> prepend when added
  function prependInstruction(instruction) {
    let assignment = createInstructionElement(instruction);
    assignmentContainer.prepend(assignment);
    assignment.style.animation = "popOut .2s linear forwards";
  }

  if (addInstructionForm) {
    addInstructionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      let data = new FormData(addInstructionForm);
      // CSRF policy
      const csrftoken = document.querySelector(
        "[name=csrfmiddlewaretoken]"
      ).value;
      try {
        let request = await fetch(INSTRUCTION_API_URL, {
          method: "post",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
          body: JSON.stringify({ text: data.get("new-assignment") }),
        });

        if (request.status == 201) {
          let instruction = await request.json();
          prependInstruction(instruction);
          return addInstructionForm.reset();
        }
      } catch (err) {
        console.error(err);
        return;
      }
    });
  }

  // Remove istruction form page
  async function removeItem(node) {
    try {
      let target = node.closest("div").getAttribute("dataset");
      let url = `${INSTRUCTION_API_URL}/${target}`;

      // CSRF policy
      const csrftoken = document.querySelector(
        "[name=csrfmiddlewaretoken]"
      ).value;
      let deleteRequest = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
      });

      if (deleteRequest.status < 399) {
        // console.log("deleted");
        displayInstructions();
        return;
      }
      return console.log(deleteRequest.status);
    } catch (err) {
      console.error(err);
      return;
    }
  }

  const writeStoryContainer = document.querySelector(".add-story");
  const closeWriteStoryBtn = document.getElementById("close-add-story");
  const writeStoryForm = document.querySelector(".add-story__form");
  const successView = document.querySelector(".success-view");

  // Open write story modal
  function openWriteStory(headline) {
    document.getElementById("first-line").value = headline;
    writeStoryForm.classList.remove("hide");
    writeStoryContainer.classList.add("open");
  }

  function closeWriteStory() {
    successView.classList.remove("show");
    writeStoryContainer.classList.remove("open");
  }

  function showSuccessMessage() {
    writeStoryForm.classList.add("hide");
    successView.classList.add("show");
    writeStoryContainer.addEventListener("click", closeWriteStory);
    setTimeout(() => {
      writeStoryContainer.removeEventListener("click", closeWriteStory);
      closeWriteStory();
    }, 15000);
  }

  closeWriteStoryBtn.addEventListener("click", (e) => {
    closeWriteStory();
  });

  // Event to write story form
  writeStoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      // Send post request to API
      let data = new FormData(writeStoryForm);
      let body = {
        author: data.get("write-story-author").toString(),
        title: data.get("title").toString(),
        headline: data.get("first-line").toString(),
        content: data.get("story-content").toString(),
      };
      // CSRF policy
      const csrftoken = document.querySelector(
        "[name=csrfmiddlewaretoken]"
      ).value;
      // POST request to api for creating new story

      let request = await fetch(WRITE_STORY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        mode: "same-origin",
        body: JSON.stringify(body),
      });

      if (request.status < 399) {
        //Show success message
        writeStoryForm.reset();
        showSuccessMessage();
        return;
      }
      let response = await request.json();
      return console.error(response.message);
    } catch (err) {
      console.error(err);
      return;
    }
  });

  assignmentContainer.addEventListener("click", async (e) => {
    if (
      e.target.matches("span") &&
      e.target.classList.contains("remove-assignment")
    ) {
      await removeItem(e.target);
    } else if (
      e.target.matches("div") &&
      e.target.classList.contains("assignment")
    ) {
      // open add story
      let headline = e.target.getAttribute("datatext");
      openWriteStory(headline);
    } else if (
      e.target.matches("i") &&
      e.target.classList.contains("fa-thumbs-up")
    ) {
      // Give a like to instruction
      let voteActions = e.target.closest(".vote-action");

      if (voteActions.classList.contains("clicked")) {
        return;
      }
      e.target.classList.add("red");
      let slug = e.target.closest(".assignment").getAttribute("dataset");
      // CSRF policy
      const csrftoken = document.querySelector(
        "[name=csrfmiddlewaretoken]"
      ).value;

      try {
        let request = await fetch(UPVOTE_INSTRUCTION_URL + slug, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
        });
        if (request.status == 200) {
          console.log("Thanks");
          voteActions.classList.add("clicked");
          return;
        }
        let response = await request.json();
        throw new Error(response.message);
      } catch (err) {
        console.error(err);
        return;
      }
    } else if (
      e.target.matches("i") &&
      e.target.classList.contains("fa-thumbs-down")
    ) {
      // Give a like to instruction
      let voteActions = e.target.closest(".vote-action");

      if (voteActions.classList.contains("clicked")) {
        return;
      }
      e.target.classList.add("red");
      let slug = e.target.closest(".assignment").getAttribute("dataset");
      // CSRF policy
      const csrftoken = document.querySelector(
        "[name=csrfmiddlewaretoken]"
      ).value;

      try {
        let request = await fetch(DOWNVOTE_INSTRUCTION_URL + slug, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
        });
        if (request.status == 200) {
          console.log("Awww");
          voteActions.classList.add("clicked");
          return;
        }
        let response = await request.json();
        throw new Error(response.message);
      } catch (err) {
        console.error(err);
        return;
      }
    }
  });
}
