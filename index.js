
  window.addEventListener('scroll', function() {
    const skillsSection = document.getElementById('skills');
    const navbar = document.getElementById('navbar');

    const skillsSectionTop = skillsSection.offsetTop;
    const scrollTop = window.scrollY;

    if (scrollTop >= skillsSectionTop) {
      navbar.classList.add('fixed-top');
    } else {
      navbar.classList.remove('fixed-top');
    }
  });
