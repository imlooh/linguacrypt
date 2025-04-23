$(document).ready(function () {
    // 🌐 Runtime State
    let runSettings = {};
    let playerDeck = [];
    let fullWordList = {};
    let currentRoom = {};
    let grammarData = {};
  
    // 📁 Load word data
    fetch("src/js/words.json")
      .then(res => res.json())
      .then(data => { fullWordList = data; })
      .catch(err => console.error("Error loading words.json:", err));

    fetch("src/js/grammar.json")
      .then(res => res.json())
      .then(data => {
        grammarData = data;
      })
      .catch(err => console.error("Error loading grammar.json:", err));
  
    // 🧭 Start run
    $('#startRun').click(() => {
      runSettings = {
        language: $('#languageSelect').val(),
        difficulty: $('#difficultySelect').val(),
        ignoreSeen: $('#ignoreSeen').is(':checked'),
        mysteryMode: $('#mysteryMode').is(':checked')
      };
  
      startLinguacryptRun(runSettings);
    });
  
    // 🎴 Draw initial deck
    function selectStartingDeck(language, wordCount = 5) {
      const words = fullWordList[language];
      if (!words || words.length === 0) return [];
      return [...words].sort(() => Math.random() - 0.5).slice(0, wordCount);
    }
  
    // 🚀 Begin a run
    function startLinguacryptRun(settings) {
      const languages = ['japanese', 'chinese'];
  
      if (settings.language === 'random' || settings.mysteryMode) {
        settings.language = languages[Math.floor(Math.random() * languages.length)];
      }
  
      $('#playerHand').empty();
      playerDeck = selectStartingDeck(settings.language);
  
      $('#output').append(`<div class="system-response">🎴 You have drawn your starting deck in <strong>${settings.language}</strong>:</div>`);
      playerDeck.forEach(card => $('#playerHand').append(formatCard(card)));
  
      $('.settings-panel').hide();
      setTimeout(() => generateRoom(settings), 500);
    }
  
    // 🧙 Room Generator
    function generateRoom(settings) {
      const roomTypes = ['ClozeRoom', 
    //    'GrammarRoom'
    ]; // Add more as needed
      const type = roomTypes[Math.floor(Math.random() * roomTypes.length)];
  
      switch (type) {
        case 'ClozeRoom':
          return generateClozeRoom(settings.language);
        case 'GrammarRoom':
          return generateGrammarRoom(settings.language);
      }
    }
  
    // 🧠 Cloze Room Logic (from playerDeck only)
    function generateClozeRoom(lang) {
      const validCards = playerDeck.filter(w => w.examples && w.examples.length > 0);
      if (validCards.length === 0) {
        $('#output').append(`<div class="system-response">⚠️ No cards with example sentences in your deck.</div>`);
        return;
      }
  
      const target = validCards[Math.floor(Math.random() * validCards.length)];
      const rawSentence = target.examples[0].sentence;
      const prompt = rawSentence.replace(target.word, '___');
  
      const distractors = playerDeck
        .filter(w => w.word !== target.word && w.type === target.type)
        .slice(0, 3)
        .map(w => w.word);
  
      const options = [...distractors, target.word].sort(() => Math.random() - 0.5);
  
      currentRoom = {
        type: 'ClozeRoom',
        prompt,
        answer: target,
        options
      };
  
      renderRoom();
    }
  
    // 📚 Grammar Room Logic
    function generateGrammarRoom(lang) {
        console.log(lang);
      const grammarSet = grammarData[lang].grammar;
      const item = grammarSet[Math.floor(Math.random() * grammarSet.length)];
    
      let prompt = item.prompt
        .replace(/@n1/g, getRandomWord(lang, 'noun'))
        .replace(/@vinf1/g, getRandomWord(lang, 'verb'))
        .replace(/@adj1/g, getRandomWord(lang, 'adjective'))
        .replace(/@p1/g, getRandomWord(lang, 'pronoun'));
  
      prompt = item.question + '<br />' + prompt;
      currentRoom = {
        type: 'GrammarRoom',
        prompt,
        answer: item.answer,
        options: item.choices
      };
  
      renderRoom();
    }
  
    // 🎰 Random filler for templates
    function getRandomWord(lang, pos) {
        let pool = [];
        if(pos == "pronoun") {
            switch(lang) {
                case "japanese":
                    pool = ["わたし", "あなた", "きみ", "かれ", "かのじょ", "わたしたち", "かれら"]
                    break;
                case "chinese":
                    pool = ["我", "你", "他", "她", "它", "我们", "你们", "他们", "她们"]
                    break;
            }
            console.log(`Pool: ${pool}`)
        } else { 
            pool = fullWordList[lang].filter(w => w.type === pos); 
        }
        const item = pool[Math.floor(Math.random() * pool.length)];
        return item ? (item.word || item) : '[???]';
    }
  
    // 🎨 Card Display
    function formatCard(card) {
      const typeClass = {
        noun: 'noun',
        verb: 'verb',
        adjective: 'adjective',
        adverb: 'adverb'
      }[card.type] || 'other';
  
      return `
        <div class="card-output ${typeClass}">
          <div class="word">${card.word}</div>
          <div class="meaning">${card.meaning}</div>
          <div class="example">
            ${card.examples[0].sentence}<br>
            ${card.examples[0].translation}
          </div>
          <div class="hover-info">
            ${card.reading ? `<div>📖 Reading: ${card.reading}</div>` : ''}
            ${card.pinyin ? `<div>📖 Pinyin: ${card.pinyin}</div>` : ''}
            <div>🔊 IPA: ${card.ipa}</div>
          </div>
        </div>
      `;
    }
  
    // 🧾 Render Room UI
    function renderRoom() {
      $('#output').empty();
      $('#output').append(`<div class="room-type">🧩 Room Type: ${currentRoom.type}</div>`);
      $('#output').append(`<div class="room-prompt">${currentRoom.prompt}</div>`);
  
      if (currentRoom.answer?.examples?.[0]?.translation) {
        $('#output').append(`<div class="room-translation">${currentRoom.answer.examples[0].translation}</div>`);
      }
  
      // First, remove any previous bindings
    $('#playerHand').off('click', '.card-output');

    // Then, bind only once per render
    $('#playerHand').on('click', '.card-output', function () {
    const choice = $(this).find('.word').text();
    checkRoomAnswer(choice);
    });
    }
  
    // ✅ Check user input
    function checkRoomAnswer(choice) {
      const correct = currentRoom.answer.word;
      if (choice === correct) {
        $('#output').append(`<div class="correct">✅ Correct!</div>`);
        setTimeout(() => generateRoom(runSettings), 500);
      } else {
        $('#output').append(`<div class="incorrect">❌ Incorrect! Correct answer: ${correct}</div>`);
      }
  
      // TODO: move to next room after short delay
    }
  });
  