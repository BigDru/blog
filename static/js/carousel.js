document.addEventListener('DOMContentLoaded', function () {
    const carousels = document.querySelectorAll('.carousel-wrapper');

    carousels.forEach(carousel_wrapper => {
        const items = carousel_wrapper.querySelectorAll('.carousel-item');

        if (items.length < 2)
        {
            return; // we don't need to do anything for single images
        }

        const previews = carousel_wrapper.querySelectorAll('.preview-item img');
        const prev_button = carousel_wrapper.querySelector('.carousel-prev');
        const next_button = carousel_wrapper.querySelector('.carousel-next');
        let current_index = 0;
        const delay = isNaN(parseInt(carousel_wrapper.dataset.delay)) ? 5000 : parseInt(carousel_wrapper.dataset.delay);
        let auto_slide_interval;

        previews[0].classList.add("active");

        function update_carousel(index) {
            carousel_wrapper.querySelector('.carousel').style.transform = `translateX(-${index * 100}%)`;
            previews.forEach((img, i) => {
                img.classList.toggle('active', i === index);
            });
        }

        function restart_auto_slide() {
            clearInterval(auto_slide_interval);
            if (delay != 0)
            {
                auto_slide_interval = setInterval(() => {
                    current_index = (current_index + 1) % items.length;
                    update_carousel(current_index);
                }, delay);
            }
        }

        next_button.addEventListener('click', () => {
            current_index = (current_index + 1) % items.length;
            update_carousel(current_index);
            restart_auto_slide(); // Restart timer on click
        });

        prev_button.addEventListener('click', () => {
            current_index = (current_index - 1 + items.length) % items.length;
            update_carousel(current_index);
            restart_auto_slide(); // Restart timer on click
        });

        previews.forEach((img, index) => {
            img.addEventListener('click', () => {
                current_index = index;
                update_carousel(current_index);
                restart_auto_slide(); // Restart timer on preview click
            });
        });

        // Start auto-slide
        restart_auto_slide();
    });
});
