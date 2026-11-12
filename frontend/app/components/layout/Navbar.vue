<template>
  <header class="navbar">
    <nav>
      <NuxtLink to="/" class="home-link nav-link" exact-active-class="active">
        <Icon class="echolotl-icon" icon="echolotl" size="1.5lh" />
        <div class="home-text"></div>
      </NuxtLink>
      <div class="nav-links">
        <NuxtLink
          to="/art"
          class="nav-link primary-nav-link lotl-font"
          exact-active-class="active"
        >
          <Icon icon="art_brush" size="1.25lh" />
          Artchive
        </NuxtLink>
        <NuxtLink
          to="/characters"
          class="nav-link primary-nav-link lotl-font"
          exact-active-class="active"
        >
          <Icon icon="character" size="1.25lh" />
          Characters
        </NuxtLink>
        <button
          type="button"
          class="nav-link menu-trigger lotl-font"
          popovertarget="navigation-menu"
          aria-controls="navigation-menu"
          aria-label="Open navigation menu"
          :aria-expanded="popoverOpen"
        >
          <Icon :icon="popoverOpen ? 'close' : 'hamburger'" size="1.25lh" />
        </button>
        <button
          type="button"
          class="nav-link theme-toggle lotl-font"
          @click="toggleTheme"
          aria-label="Toggle theme"
        >
          <Icon :icon="theme ? 'sun' : 'moon'" size="1.25lh" />
        </button>
      </div>
    </nav>
    <div
      id="navigation-menu"
      class="menu"
      popover="auto"
      :style="`filter: ${filterUrl}`"
    >
      <div class="link-grid mobile-menu-links">
        <NuxtLink
          to="/art"
          class="nav-link lotl-font"
          exact-active-class="active"
        >
          <Icon icon="art_brush" size="1.25lh" />
          Artchive
        </NuxtLink>
        <NuxtLink
          to="/characters"
          class="nav-link lotl-font"
          exact-active-class="active"
        >
          <Icon icon="character" size="1.25lh" />
          Characters
        </NuxtLink>
      </div>
      <div class="menu-header lotl-font">Other Stuff. . .</div>
      <div class="link-grid">
        <NuxtLink
          to="/picross"
          class="nav-link lotl-font"
          exact-active-class="active"
        >
          <Icon icon="picross" size="1.25lh" />
          Picross
        </NuxtLink>
        <NuxtLink
          to="/wheel"
          class="nav-link lotl-font"
          exact-active-class="active"
        >
          <Icon icon="wheel" size="1.25lh" />
          Wheel
        </NuxtLink>
        <NuxtLink
          to="/account"
          class="nav-link lotl-font"
          exact-active-class="active"
        >
          <Icon icon="profile" size="1.25lh" />
          Account
        </NuxtLink>
        <NuxtLink
          to="#"
          class="nav-link lotl-font disabled"
          exact-active-class="active"
        >
          <Icon icon="lore" size="1.25lh" />
          Blog
        </NuxtLink>
      </div>
      <hr class="menu-divider" />
      <button
        type="button"
        class="nav-link mobile-theme-toggle"
        @click="toggleTheme"
        aria-label="Toggle theme"
      >
        <Icon :icon="theme ? 'sun' : 'moon'" size="1.25lh" />
        <span class="lotl-font" style="text-box-trim: trim-end">Theme</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import Icon from "../ui/Icon.vue";
const { url: filterUrl } = useSketchFilter(() => ({
  color: "var(--distant)",
}));

const { theme, toggleTheme } = useTheme();

const route = useRoute();

const popoverOpen = ref(false);

onMounted(() => {
  const menu = document.getElementById("navigation-menu");
  if (menu) {
    menu.addEventListener("toggle", () => {
      popoverOpen.value = menu.matches(":popover-open");
    });
  }
});
</script>

<style scoped>
.navbar {
  padding: 4px 2px;
  background-color: var(--distant);
  color: var(--text);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  .nav-link {
    color: var(--text);
    display: flex;
    align-items: center;
    text-box-trim: trim-end;
    gap: 6px;
    cursor: pointer;
    text-decoration: none;
    &.disabled {
      pointer-events: none;
      color: var(--text-secondary);
    }
    &:hover,
    &.active {
      color: var(--theme-color);
    }
  }
  > nav {
    padding: 2px 12px 0;
    max-width: 1200px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0 auto;
  }
  &::after {
    content: "";
    position: absolute;
    display: block;
    clear: both;
    mask-image: url("/images/sketch_divider.webp");
    mask-repeat: repeat-x;
    mask-position: center;
    mask-size: contain;
    background-color: var(--distant);
    width: 100%;
    height: 16px;
    bottom: -14px;
    left: 0;
    transition: background-color 0.3s ease;
  }
}

.home-text {
  display: inline-block;
  mask-image: url("/images/logo.webp");
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  width: 120px;
  height: 1.25lh;
  background-color: currentColor;
}

.nav-links {
  display: flex;
  gap: 12px;

  > .nav-link {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.menu-trigger {
  anchor-name: --navbar-menu;
  border: 0;
  background: none;
  font: inherit;
  padding: 0;
}

.theme-toggle {
  border: 0;
  background: none;
  font: inherit;
  padding: 0;
}

.link-grid.mobile-menu-links,
.nav-link.mobile-theme-toggle {
  display: none;
}

.menu {
  display: flex;
  flex-direction: column;
  position-anchor: --navbar-menu;
  position: fixed;
  inset: auto;
  width: 275px;
  top: anchor(bottom);
  right: anchor(right);
  margin: 0.25rem 0 0;
  background-color: var(--distant);
  color: var(--text);
  border: none;
  z-index: 1001;
  border-radius: 0 0 12px 12px;
  padding: 8px 8px;
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  opacity: 0;
  transform: translateY(-2px);
  transition:
    opacity 0.1s ease,
    transform 0.1s ease;
  pointer-events: none;
  &:popover-open {
    display: flex;
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  @media (max-width: 768px) {
    position-anchor: none;
    top: 32px;
    right: 0;
    width: calc(100% - 16px);
    gap: 8px;
  }
}

.mobile-theme-toggle {
  border: 0;
  background: none;
  font: inherit;
  padding: 0;
  width: 100%;
}

.menu-header {
  font-size: var(--small-text);
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.menu-divider {
  border: 0;
  border-top: 1px solid rgba(from var(--inverted-solid) r g b / 0.1);
  margin: 2px 0;
  display: none;
  @media (max-width: 768px) {
    display: block;
  }
}

.link-grid {
  display: grid;
  grid-template-columns: 50% 50%;
  gap: 8px;
}

@media (max-width: 768px) {
  .nav-links > .primary-nav-link,
  .nav-links > .theme-toggle,
  .navbar .menu .menu-header {
    display: none;
  }

  .link-grid.mobile-menu-links,
  .navbar .menu .nav-link.mobile-theme-toggle,
  .navbar .menu .link-grid {
    display: grid;
    grid-template-columns: 100%;
  }

  .navbar .menu .nav-link.mobile-theme-toggle {
    display: flex;
  }
}

.echolotl-icon {
  pointer-events: none;
  will-change: transform;
}

.home-link:hover .echolotl-icon {
  animation: jumpAndFlip 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.home-link:hover .echolotl-icon,
.home-link:hover .home-text {
  transition: none;
}

.home-link:hover {
  animation: accentColorPulse 1.5s ease infinite;
  transition: none;
}

@keyframes jumpAndFlip {
  0% {
    transform: rotateY(0) translateY(0px);
  }
  35% {
    transform: rotateY(180deg) translateY(-13px) rotateZ(-8deg);
  }
  65% {
    transform: rotateY(360deg) translateY(-8px) rotateZ(4deg);
  }
  85% {
    transform: rotateY(360deg) translateY(0px) rotateZ(2deg);
  }
  92% {
    transform: rotateY(360deg) translateY(-1px) rotateZ(1deg);
  }
  100% {
    transform: rotateY(360deg) translateY(0px) rotateZ(0deg);
  }
}

@keyframes accentColorPulse {
  0% {
    color: var(--theme-color);
  }
  50% {
    color: color-mix(
      in oklab,
      var(--theme-color) 90%,
      var(--inverted-solid) 10%
    );
  }
  100% {
    color: var(--theme-color);
  }
}
</style>
