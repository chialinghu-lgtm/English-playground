(function () {
    'use strict';
    const {id, selector} = window.gameTeacherConfig;
    const teacher = new URLSearchParams(location.search).get('teacher') === '1';
    const key = 'classroom-settings-v1:' + id;
    const panel = document.querySelector(selector);
    const fields = () => [...panel.querySelectorAll('input[id],select[id],textarea[id]')].filter(e => e.type !== 'file');
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(key)); } catch (_) {}

    function restore() {
        if (!saved || !saved.fields) return;
        for (const field of fields()) {
            if (!Object.hasOwn(saved.fields, field.id)) continue;
            if (field.type === 'checkbox') field.checked = !!saved.fields[field.id];
            else field.value = saved.fields[field.id];
        }
        if (window.gameTeacherState && saved.state) window.gameTeacherState.restore(saved.state);
    }

    function valid() {
        if (!fields().every(field => field.reportValidity())) return false;
        const words = fieldId => document.getElementById(fieldId).value.split(/[,\n]/).map(w => w.trim()).filter(Boolean);
        const minimum = id === 'castle-defense' ? ['vocab-input', 6] : id === 'tap-and-guess' ? ['inputOptions', 2] : ['whack-a-mole', 'slot-machine'].includes(id) ? ['inputWords', id === 'slot-machine' ? 3 : 2] : id === 'snakes-and-ladders' ? ['wordList', 1] : null;
        if (minimum && words(minimum[0]).length < minimum[1]) {
            alert('請至少輸入 ' + minimum[1] + ' 個單字／選項。'); return false;
        }
        if(id === 'kick-it-out' && (!words('cfgItems').length || words('cfgItems').some(w => !/^.+:.+$/.test(w)))) {
            alert('請輸入 A:B 格式的題目；不足 16 格時會重複使用。'); return false;
        }
        if(window.gameTeacherState && !window.gameTeacherState.read().pool.length) {
            alert('請先加入題目或選擇單元。'); return false;
        }
        return true;
    }

    function save() {
        if (!valid()) return false;
        const data = {fields: Object.fromEntries(fields().map(e => [e.id, e.type === 'checkbox' ? e.checked : e.value])), state: window.gameTeacherState ? window.gameTeacherState.read() : null};
        try {
            localStorage.setItem(key, JSON.stringify(data));
            document.getElementById('save-status').textContent = '已儲存。下次開啟此遊戲會套用設定。';
            return true;
        } catch (_) { alert('瀏覽器無法儲存設定，請檢查儲存空間與隱私設定。'); return false; }
    }

    function cleanGameURL() { const url = new URL(location.href); url.searchParams.delete('teacher'); return url.href; }

    window.addEventListener('load', () => {
        restore();
        const toolbar = document.getElementById('classroomToolbar');
        if (toolbar) document.body.prepend(toolbar);
        if (teacher) {
            document.body.classList.add('teacher-mode');
            panel.classList.remove('collapsed');
            panel.classList.add('teacher-editor');
            document.body.append(panel);
            const bar = document.createElement('div'); bar.className = 'teacher-save-bar';
            bar.innerHTML = '<button class="teacher-save" id="save-settings">💾 儲存設定</button><button class="teacher-save" id="launch-game">▶ 儲存並開啟遊戲</button><span id="save-status" role="status">準備好後，請儲存設定。</span>';
            document.body.append(bar);
            document.getElementById('save-settings').onclick = save;
            document.getElementById('launch-game').onclick = () => { if (save()) window.top.location.href = cleanGameURL(); };
            // Reuse the original editors without allowing start/apply buttons to hide them.
            panel.addEventListener('click', event => {
                const button = event.target.closest('button');
                if (button && /applySettings|saveAdminAndStart|initAndBuildGame|updateGame|saveVocabConfig|closeConfigModal/.test(button.getAttribute('onclick') || '')) {
                    event.preventDefault(); event.stopImmediatePropagation(); save();
                }
            }, true);
            if (typeof timerInterval !== 'undefined') clearInterval(timerInterval);
            return;
        }

        panel.style.setProperty('display', 'none', 'important');
        document.querySelectorAll('.panel-toggle-btn,.admin-btn.config').forEach(e => e.style.display = 'none');
        const actions = document.createElement('nav'); actions.className = 'play-actions'; actions.setAttribute('aria-label', '遊戲操作');
        const back = document.createElement('a'); back.href = '../teacher.html?game=' + id; back.textContent = '⚙ 教師後台'; actions.append(back);
        if (['tug-of-war', 'quiz-battle'].includes(id)) {
            const next = document.createElement('button'); next.textContent = '🎲 下一題'; next.onclick = () => setupNewGame(); actions.append(next);
        }
        if(id === 'tap-and-guess') {
            const next = document.createElement('button'); next.textContent = '🎲 藏好新目標'; next.onclick = () => randomHide(); actions.append(next);
        }
        if(toolbar) toolbar.after(actions); else document.body.prepend(actions);
        // Restore game-specific state only after each game's original initialization has run.
        if (id === 'kick-it-out') saveAdminAndStart();
        if (id === 'snakes-and-ladders') initAndBuildGame();
        if (['whack-a-mole','slot-machine'].includes(id)) applySettings(true);
        if (id === 'tap-and-guess') { updateGame(); randomHide(); }
        if (id === 'castle-defense' && saved) {
            globalWordPool = document.getElementById('vocab-input').value.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
            pickRandomSixWords(); initPanelQuestion('A'); initPanelQuestion('B');
        }
        document.querySelectorAll('[onclick="backToAdmin()"],[onclick="openConfigModal()"]') .forEach(button => button.onclick = () => { location.href = back.href; });
        if (id === 'kick-it-out') document.querySelectorAll('[onclick="location.reload()"]') .forEach(button => {
            button.textContent = '⚙ 回教師後台'; button.onclick = () => { location.href = back.href; };
        });
    });
})();
