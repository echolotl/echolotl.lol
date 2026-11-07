<template>
  <header class="navbar">
    <nav class="navbar-top">
      <div class="navbar-top__content">
        <!-- Desktop theme icon -->
        <button
          type="button"
          class="navbar-top__themeicon navbar-top__themeicon--desktop"
          :aria-label="`Switch to ${props.light ? 'dark' : 'light'} theme`"
          @click="toggleTheme">
          <Icon
            :icon="currentThemeIcon"
            size="48px"
            class="icon icon--hoverable" />
        </button>

        <!-- Mobile hamburger menu -->
        <button
          type="button"
          class="navbar-top__hamburger"
          :aria-expanded="mobileMenuOpen"
          aria-controls="primary-mobile-navigation"
          :aria-label="mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'"
          @click="toggleMobileMenu">
          <Icon
            :icon="mobileMenuOpen ? 'close' : 'hamburger-open'"
            size="48px"
            class="icon icon--hoverable" />
        </button>

        <div class="navbar-top__logo">
          <nuxt-link to="/" aria-label="Go to homepage">
            <Icon
              icon="echolotl"
              size="48px"
              class="navbar-top__logo-icon navbar-top__logo-icon--desktop"
              color="var(--inverted-solid)"
              :style="{
                background:
                  route.path === '/' ? 'var(--primary)' : 'var(--text)',
              }" />
            <div
              class="navbar-top__logo-image"
              :style="{
                background:
                  route.path === '/' ? 'var(--primary)' : 'var(--text)',
              }" />
          </nuxt-link>
        </div>

        <!-- Desktop navigation icons -->
        <div class="navbar-top__nav-icons navbar-top__nav-icons--desktop">
          <nuxt-link
            v-for="(navIcon, index) in navIcons"
            :key="index"
            :to="navIcon.to"
            :aria-current="route.path === navIcon.to ? 'page' : undefined">
            <Icon
              :icon="navIcon.icon"
              :alt="navIcon.alt"
              size="48px"
              class="icon icon--hoverable"
              :style="
                route.path === navIcon.to
                  ? `background: var(--primary);`
                  : 'background: var(--text)'
              " />
          </nuxt-link>
        </div>
      </div>

      <!-- Mobile menu dropdown -->
      <div
        id="primary-mobile-navigation"
        v-show="mobileMenuOpen"
        class="navbar-top__mobile-menu"
        aria-label="Primary">
        <div class="navbar-top__mobile-menu-content">
          <!-- Mobile theme toggle -->
          <button
            type="button"
            class="navbar-top__mobile-item"
            @click="toggleTheme">
            <Icon
              :icon="currentThemeIcon"
              size="32px"
              class="icon icon--hoverable" />
            <span>{{ props.light ? "Dark Mode" : "Light Mode" }}</span>
          </button>

          <!-- Mobile navigation items -->
          <nuxt-link
            v-for="(navIcon, index) in navIcons"
            :key="index"
            :to="navIcon.to"
            class="navbar-top__mobile-item"
            :aria-current="route.path === navIcon.to ? 'page' : undefined"
            @click="closeMobileMenu">
            <Icon
              :icon="navIcon.icon"
              :alt="navIcon.alt"
              size="32px"
              class="icon icon--hoverable"
              :style="{
                background:
                  route.path === navIcon.to
                    ? 'linear-gradient(to bottom in oklab, var(--primary), var(--text))'
                    : 'var(--text)',
              }" />
            <span>{{ navIcon.alt }}</span>
          </nuxt-link>
        </div>
      </div>
    </nav>
    <div class="navbar-bottom" :class="{ light: props.light }" />
  </header>
  <div class="navbar-spacer" />
</template>

<script setup lang="ts">
import Icon from "@/components/ui/Icon.vue";

interface NavIcon {
  icon: string;
  alt: string;
  to: string;
}

const navIcons: NavIcon[] = [
  { icon: "art_brush", alt: "Art", to: "/art" },
  { icon: "character", alt: "Characters", to: "/characters" },
];

const props = defineProps({
  light: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["toggle-theme"]);

const mobileMenuOpen = ref(false);
const currentThemeIcon = computed(() => (props.light ? "moon" : "sun"));
const route = useRoute();

function toggleTheme() {
  emit("toggle-theme");
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

// Close mobile menu when clicking outside or when route changes
onMounted(() => {
  const handleClickOutside = (event: Event) => {
    const navbar = document.querySelector(".navbar");
    if (navbar && !navbar.contains(event.target as Node)) {
      mobileMenuOpen.value = false;
    }
  };

  document.addEventListener("click", handleClickOutside);

  onUnmounted(() => {
    document.removeEventListener("click", handleClickOutside);
  });
});
</script>

<style scoped lang="scss">
@use "@/assets/styles/partials/_variables.scss" as vars;
@use "@/assets/styles/partials/_mixins" as *;

.navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  @media not screen {
    display: none;
  }
}

.navbar-top {
  width: 100%;
  height: fit-content;
  background-color: var(--distant);
}

.navbar-top__content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  padding: 0 1rem;
  padding-top: 0.75rem;
  height: 100%;
  width: calc(100% - 2rem);
  position: relative;

  @media (max-width: 768px) {
    justify-content: space-between;
  }
}

.navbar-top__themeicon--desktop {
  position: absolute;
  left: 1rem;
  padding: 0;
  border: 0;
  background: transparent;

  @media (max-width: 768px) {
    display: none;
  }
}

.navbar-top__hamburger {
  position: absolute;
  left: 1rem;
  display: none;
  padding: 0;
  border: 0;
  background: transparent;

  @media (max-width: 768px) {
    display: block;
    position: static;
    order: 2;
  }
}

.navbar-top__logo:hover * .navbar-top__logo-icon,
.navbar-top__logo:focus-visible * .navbar-top__logo-icon {
  animation: jumpAndFlip 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.navbar-top__logo a {
  display: flex;
  flex-direction: row;
  min-width: auto;
  &:hover {
    .navbar-top__logo-icon,
    .navbar-top__logo-image {
      background: var(--primary) !important;
    }
  }

  @media (max-width: 768px) {
    order: 1;
    img {
      width: 200px;
      height: auto;
    }
  }
}

.navbar-top__logo-icon {
  margin-right: 0.5rem;
}

.navbar-top__logo-icon--desktop {
  @media (max-width: 768px) {
    display: none !important;
  }
}

.navbar-top__logo-image {
  width: 300px;
  height: 48px;
  mask-image: url("~/assets/images/logo.png");
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;

  @media (max-width: 768px) {
    width: 200px;
    height: auto;
    aspect-ratio: 4.17;
  }
}

.navbar-top__nav-icons--desktop {
  display: flex;
  gap: 1rem;
  align-items: center;
  position: absolute;
  right: 1rem;

  @media (max-width: 768px) {
    display: none;
  }
}

.navbar-top__mobile-menu {
  position: absolute;
  top: 50;
  left: 0;
  width: 100%;
  background-color: var(--distant);
  display: none;

  @media (max-width: 768px) {
    display: block;
  }
}

.navbar-top__mobile-menu-content {
  padding: 1rem;
  padding-top: calc(1rem + 60px);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.navbar-top__mobile-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  text-decoration: none;
  color: var(--inverted-solid);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--surface);
  }

  span {
    font-size: var(--base-text);
    font-weight: 500;
  }

  .icon {
    flex-shrink: 0;
  }
}

button.navbar-top__mobile-item {
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
}

.navbar-bottom {
  width: 100%;
  height: 60px;
  mask-image: url("@/assets/images/sketch_divider.png");
  background-color: var(--distant);
  transform: scaleY(-1);
}

.icon {
  cursor: pointer;
  color: var(--inverted-solid);

  &--hoverable {
    @include hover-scale(1.1);
    &:hover {
      background: var(--primary) !important;
    }
  }
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

.navbar-spacer {
  height: 64px;
  @media not screen {
    display: none;
  }
}
</style>
