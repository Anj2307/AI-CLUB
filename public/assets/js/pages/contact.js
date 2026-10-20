document.addEventListener("site:ready", () => {
  const { getData, icon, socialLinks, api, mode } = window.Site;
  const s = getData().settings;
  const mail = document.getElementById("c-email");
  mail.textContent = s.email; mail.href = "mailto:" + s.email;
  document.getElementById("c-address").textContent = s.address;
  document.getElementById("c-socials").innerHTML = socialLinks(s.socials);
  document.getElementById("ic-mail").innerHTML = icon("email");
  document.getElementById("ic-pin").innerHTML = icon("pin");
  document.getElementById("ic-link").innerHTML = icon("link");

  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const submit = document.getElementById("f-submit");
  const v = (id) => document.getElementById(id).value.trim();
  if (mode() === "static") document.getElementById("form-note").textContent = "This opens your email app with the message filled in.";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = { name: v("f-name"), email: v("f-email"), topic: v("f-topic"), body: v("f-msg"), website: v("f-website") };

    // No backend (static hosting): hand the message to the visitor's email app.
    if (mode() === "static") {
      const body = `${payload.body}\n\n- ${payload.name} (${payload.email})`;
      location.href = `mailto:${s.email}?subject=${encodeURIComponent("[" + payload.topic + "] Message from " + payload.name)}&body=${encodeURIComponent(body)}`;
      return;
    }

    submit.disabled = true;
    submit.textContent = "Sending...";
    status.className = "full form-status";
    status.textContent = "";
    try {
      await api("/messages", { method: "POST", body: payload });
      form.reset();
      status.classList.add("ok");
      status.textContent = "Thanks! Your message has reached the team. We'll get back to you soon.";
    } catch (err) {
      status.classList.add("err");
      const first = err.details && Object.values(err.details)[0];
      status.textContent = first ? `${err.message}: ${first}` : err.message;
    } finally {
      submit.disabled = false;
      submit.innerHTML = "Send message &rarr;";
    }
  });
});
