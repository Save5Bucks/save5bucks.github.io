const languages = [
            'Lua', 'Python', 'Java', 'JavaScript', 'C#', 'C++', 'MySQL', 'MariaDB', 'HTML', 'CSS', 'Visual Basic', 'XAML', 
            '3DS Max', 'AI', 'Day Z', 'GTA V', 'The Isle', 'Rust', 'Valheim', 'Ark', 'Node JS', 'React JS', 'Angular JS', 
            'Vue JS', 'Express JS', 'Photo Shop', 'Arma Reforger', 'Atlas', 'VPS', 'Dedicated Servers', 'Wix', 'Project Zomboid'
        ].sort();

        const container = document.getElementById('bubble-container');
        let containerRect = container.parentElement.getBoundingClientRect();
        const title = document.getElementById('title');
        let titleRect = title.getBoundingClientRect();
        const scoreboard = document.getElementById('scoreboard');
        let scoreboardRect = scoreboard.getBoundingClientRect();
        const scoreList = document.getElementById('score-list');
        const bubbles = [];

        // Canvas for text measurement
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '16px "Courier New", monospace';

        // Initialize scores
        const scores = {};
        languages.forEach(lang => scores[lang] = 0);

        languages.forEach(lang => {
            const textWidth = ctx.measureText(lang).width;
            const size = textWidth + 10;

            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            bubble.innerText = lang;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.fontSize = '16px';
            bubble.style.left = `${Math.random() * (containerRect.width - size)}px`;
            bubble.style.top = `${Math.random() * (containerRect.height - size - titleRect.height)}px`;

            const bubbleData = {
                element: bubble,
                x: parseFloat(bubble.style.left) + size / 2,
                y: parseFloat(bubble.style.top) + size / 2,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                radius: size / 2,
                isDragging: false,
                name: lang
            };
            bubbles.push(bubbleData);
            container.appendChild(bubble);

            // Dragging
            let offsetX, offsetY;
            bubble.addEventListener('mousedown', (e) => {
                bubbleData.isDragging = true;
                offsetX = e.clientX - bubbleData.x;
                offsetY = e.clientY - bubbleData.y;
                bubbleData.vx = 0;
                bubbleData.vy = 0;
            });

            document.addEventListener('mousemove', (e) => {
                if (bubbleData.isDragging) {
                    bubbleData.x = e.clientX - offsetX;
                    bubbleData.y = e.clientY - offsetY;
                    keepInBounds(bubbleData);
                    updatePosition(bubbleData);
                }
            });

            document.addEventListener('mouseup', () => {
                if (bubbleData.isDragging) {
                    bubbleData.isDragging = false;
                    bubbleData.vx = (Math.random() - 0.5) * 2;
                    bubbleData.vy = (Math.random() - 0.5) * 2;
                }
            });
        });

        // Initial scoreboard render
        updateScoreboard();

        // Update bounding boxes on resize
        window.addEventListener('resize', () => {
            containerRect = container.parentElement.getBoundingClientRect();
            titleRect = title.getBoundingClientRect();
            scoreboardRect = scoreboard.getBoundingClientRect();
            bubbles.forEach(bubble => keepInBounds(bubble));
        });

        function updatePosition(bubble) {
            bubble.element.style.left = `${bubble.x - bubble.radius}px`;
            bubble.element.style.top = `${bubble.y - bubble.radius}px`;
        }

        function keepInBounds(bubble) {
            bubble.x = Math.max(bubble.radius + scoreboardRect.width + 10, Math.min(bubble.x, containerRect.width - bubble.radius));
            bubble.y = Math.max(bubble.radius + titleRect.height, Math.min(bubble.y, containerRect.height - bubble.radius));
        }

        function checkBubbleCollision(bubble1, bubble2) {
            const dx = bubble2.x - bubble1.x;
            const dy = bubble2.y - bubble1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = bubble1.radius + bubble2.radius;

            if (distance < minDistance) {
                // Flash red border
                bubble1.element.classList.add('colliding');
                bubble2.element.classList.add('colliding');
                setTimeout(() => {
                    bubble1.element.classList.remove('colliding');
                    bubble2.element.classList.remove('colliding');
                }, 100);

                // Increment scores
                scores[bubble1.name]++;
                scores[bubble2.name]++;
                updateScoreboard();

                // Collision response
                const nx = dx / (distance || 1);
                const ny = dy / (distance || 1);
                const overlap = minDistance - distance;
                const moveX = nx * overlap / 2;
                const moveY = ny * overlap / 2;

                bubble1.x -= moveX;
                bubble1.y -= moveY;
                bubble2.x += moveX;
                bubble2.y += moveY;

                const v1x = bubble1.vx;
                const v1y = bubble1.vy;
                const v2x = bubble2.vx;
                const v2y = bubble2.vy;
                bubble1.vx = v2x;
                bubble1.vy = v2y;
                bubble2.vx = v1x;
                bubble2.vy = v1y;
            }
        }

        function checkTitleCollision(bubble) {
            const titleLeft = 0;
            const titleRight = containerRect.width;
            const titleTop = 0;
            const titleBottom = titleRect.height;

            const bubbleLeft = bubble.x - bubble.radius;
            const bubbleRight = bubble.x + bubble.radius;
            const bubbleTop = bubble.y - bubble.radius;
            const bubbleBottom = bubble.y + bubble.radius;

            if (bubbleRight > titleLeft && bubbleLeft < titleRight &&
                bubbleBottom > titleTop && bubbleTop < titleBottom) {
                bubble.y = titleBottom + bubble.radius;
                bubble.vy = Math.abs(bubble.vy);
            }
        }

        function checkScoreboardCollision(bubble) {
            const scoreLeft = scoreboardRect.left;
            const scoreRight = scoreboardRect.right;
            const scoreTop = scoreboardRect.top;
            const scoreBottom = scoreboardRect.bottom;

            const bubbleLeft = bubble.x - bubble.radius;
            const bubbleRight = bubble.x + bubble.radius;
            const bubbleTop = bubble.y - bubble.radius;
            const bubbleBottom = bubble.y + bubble.radius;

            if (bubbleRight > scoreLeft && bubbleLeft < scoreRight &&
                bubbleBottom > scoreTop && bubbleTop < scoreBottom) {
                if (bubbleLeft < scoreRight) {
                    bubble.x = scoreRight + bubble.radius + 10;
                    bubble.vx = Math.abs(bubble.vx);
                }
            }
        }

        function updateScoreboard() {
            scoreList.innerHTML = '';
            languages.forEach(lang => {
                const li = document.createElement('li');
                li.textContent = `${lang}: ${scores[lang]}`;
                scoreList.appendChild(li);
            });
        }

        function animate() {
            bubbles.forEach(bubble => {
                if (!bubble.isDragging) {
                    bubble.x += bubble.vx;
                    bubble.y += bubble.vy;

                    // Bounce off container walls
                    if (bubble.x - bubble.radius < scoreboardRect.width + 10) {
                        bubble.x = scoreboardRect.width + 10 + bubble.radius;
                        bubble.vx = -bubble.vx;
                    }
                    if (bubble.x + bubble.radius > containerRect.width) {
                        bubble.x = containerRect.width - bubble.radius;
                        bubble.vx = -bubble.vx;
                    }
                    if (bubble.y + bubble.radius > containerRect.height) {
                        bubble.y = containerRect.height - bubble.radius;
                        bubble.vy = -bubble.vy;
                    }

                    checkTitleCollision(bubble);
                    checkScoreboardCollision(bubble);
                    keepInBounds(bubble);
                    updatePosition(bubble);
                }
            });

            for (let i = 0; i < bubbles.length; i++) {
                for (let j = i + 1; j < bubbles.length; j++) {
                    checkBubbleCollision(bubbles[i], bubbles[j]);
                }
            }

            requestAnimationFrame(animate);
        }
        animate();