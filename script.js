async function getJSON(url, options) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message);
  return json;
}

async function getUserData(username) {
  return await getJSON(`https://api.github.com/users/${username}`);
}

async function getWithPagination(total_number, per_page, func) {
  const numberOfRequests = Math.ceil(total_number / per_page);
  const promises = Array.from({ length: numberOfRequests }, async (_, i) => {
    const page = i + 1;
    return await func(page);
  });
  const accumulator = await Promise.all(promises);
  return accumulator.flat();
}

function getFollowers(username, total) {
  const per_page = 100;
  return getWithPagination(
    total,
    per_page,
    async (page) =>
      await getJSON(
        `https://api.github.com/users/${username}/followers?page=${page}&per_page=${per_page}`
      )
  );
}

function getFollowing(username, total) {
  const per_page = 100;
  return getWithPagination(
    total,
    per_page,
    async (page) =>
      await getJSON(
        `https://api.github.com/users/${username}/following?page=${page}&per_page=${per_page}`
      )
  );
}

async function findNonFollowers(username) {
  const userData = await getUserData(username);

  const [followers, following] = await Promise.all([
    getFollowers(username, userData.followers),
    getFollowing(username, userData.following),
  ]);

  // nonFollowers = following - followers
  const nonFollowers = following.filter(
    (user) => !followers.find((f) => f.login === user.login)
  );

  return nonFollowers;
}

function renderUser(username) {
  return `<div class="item">
    <img
      class="ui avatar image"
      src="https://avatars.githubusercontent.com/${username}"
    />
    <div class="content">
      <div class="header">
      <a target='_blank' href='//github.com/${username}'>@${username} </a>
      </div>
    </div>
  </div>`;
}

$(".ui.form").submit(async function (e) {
  e.preventDefault();
  $(".ui.statistic .value").text(0);
  $("#list-of-non-followers").html("");
  $(".ui.form").addClass("loading");
  const username = $("#username").val();
  try {
    const nonFollowers = await findNonFollowers(username);
    $(".ui.statistic .value").text(nonFollowers.length);
    if (nonFollowers.length)
      $("#list-of-non-followers").html(
        nonFollowers.map((user) => renderUser(user.login))
      );
  } catch (err) {
    alert(err.message);
  } finally {
    $(".ui.form").removeClass("loading");
  }
});
