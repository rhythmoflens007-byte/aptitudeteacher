"""The tutor when the AI is switched off or out of reach.

It can't hold a free conversation, but it still teaches in the learner's language: it walks through the
translated solution of the question being discussed (or just a hint, or just the answer, if that's what
the student asked for), and for general questions it recognises the topic and gives a short lesson card.
Every sentence starts with an [emotion] tag, like the AI's replies, so the avatar still acts it out.
"""

import re
from dataclasses import dataclass

from app.content_i18n import localize


@dataclass(frozen=True)
class Help:
    """What the offline tutor knows about the conversation's question, already in the learner's language."""

    solution: str | None = None
    answer: str | None = None
    question_text: str | None = None


def help_for(question, question_text: str | None, locale: str) -> Help:
    if question is None:
        return Help(question_text=question_text)
    shown = localize(question, locale)
    if shown:
        return Help(shown["explanation"], shown["labels"].get(question.correct_option, question.correct_option))
    return Help(question.explanation, question.correct_option)


PHRASES = {
    "en": {
        "intro": "[neutral] I'm {name}. My AI brain is offline right now, so I'm in offline mode, but I can still teach from my notes.",
        "solution": "[thinking] Here's the worked solution, step by step:",
        "hint": "[encouraging] Here's a hint to get you started:",
        "hint_next": "[curious] Try the rest yourself, then ask me for the full solution.",
        "answer": "[careful] The correct answer is {answer}.",
        "answer_next": "[encouraging] Ask me 'why' if you'd like the steps.",
        "practise": "[encouraging] Then try the next question on the same idea in Practice to lock it in.",
        "topic": "[excited] Let's look at {topic}.",
        "topic_next": "[encouraging] Want to practise it? Open Practice and pick this topic.",
        "typed": "[thinking] I can't solve a brand-new question without my AI, but here's the method that cracks it.",
        "menu": "[curious] From my notes I can explain: {topics}. Type one of them, or open a question from Practice and ask me about it.",
    },
    "hi": {
        "intro": "[neutral] मैं {name} हूँ। अभी मेरा AI ऑफ़लाइन है, इसलिए मैं ऑफ़लाइन मोड में हूँ, पर अपने नोट्स से फिर भी सिखा {can} हूँ।",
        "solution": "[thinking] यह रहा हल, कदम-दर-कदम:",
        "hint": "[encouraging] शुरुआत के लिए एक संकेत:",
        "hint_next": "[curious] बाकी ख़ुद हल करके देखिए, फिर पूरा हल पूछिए।",
        "answer": "[careful] सही उत्तर है {answer}।",
        "answer_next": "[encouraging] कदम जानने हों तो मुझसे 'क्यों' पूछिए।",
        "practise": "[encouraging] फिर इसे पक्का करने के लिए अभ्यास में इसी विचार का अगला सवाल हल कीजिए।",
        "topic": "[excited] चलिए {topic} समझते हैं।",
        "topic_next": "[encouraging] अभ्यास करना है? अभ्यास खोलिए और यही विषय चुनिए।",
        "typed": "[thinking] बिना AI के मैं बिल्कुल नया सवाल हल नहीं कर {can}, पर यह रहा उसे हल करने का तरीका।",
        "menu": "[curious] अपने नोट्स से मैं ये समझा {can} हूँ: {topics}। इनमें से कोई एक लिखिए, या अभ्यास से कोई सवाल खोलकर उसके बारे में पूछिए।",
    },
    "ta": {
        "intro": "[neutral] நான் {name}. இப்போது என் AI இணைப்பில் இல்லை, அதனால் ஆஃப்லைன் முறையில் இருக்கிறேன்; ஆனாலும் என் குறிப்புகளிலிருந்து கற்பிக்க முடியும்.",
        "solution": "[thinking] இதோ படிப்படியான தீர்வு:",
        "hint": "[encouraging] தொடங்க ஒரு குறிப்பு:",
        "hint_next": "[curious] மீதியை நீங்களே முயற்சி செய்யுங்கள், பிறகு முழுத் தீர்வைக் கேளுங்கள்.",
        "answer": "[careful] சரியான விடை {answer}.",
        "answer_next": "[encouraging] படிகள் வேண்டுமெனில் 'ஏன்' என்று கேளுங்கள்.",
        "practise": "[encouraging] பிறகு இதை உறுதியாக்கப் பயிற்சியில் இதே கருத்தின் அடுத்த கேள்வியை முயற்சி செய்யுங்கள்.",
        "topic": "[excited] {topic} பற்றிப் பார்ப்போம்.",
        "topic_next": "[encouraging] பயிற்சி செய்ய வேண்டுமா? பயிற்சியைத் திறந்து இந்தத் தலைப்பைத் தேர்ந்தெடுங்கள்.",
        "typed": "[thinking] AI இல்லாமல் முற்றிலும் புதிய கேள்வியைத் தீர்க்க முடியாது, ஆனால் அதைத் தீர்க்கும் வழி இதோ.",
        "menu": "[curious] என் குறிப்புகளிலிருந்து இவற்றை விளக்க முடியும்: {topics}. இவற்றில் ஒன்றைத் தட்டச்சு செய்யுங்கள், அல்லது பயிற்சியிலிருந்து ஒரு கேள்வியைத் திறந்து அதைப் பற்றிக் கேளுங்கள்.",
    },
    "te": {
        "intro": "[neutral] నేను {name}. ప్రస్తుతం నా AI ఆఫ్‌లైన్‌లో ఉంది, కాబట్టి ఆఫ్‌లైన్ మోడ్‌లో ఉన్నాను, అయినా నా నోట్స్ నుంచి నేర్పించగలను.",
        "solution": "[thinking] ఇదిగో దశలవారీ పరిష్కారం:",
        "hint": "[encouraging] మొదలుపెట్టడానికి ఒక సూచన:",
        "hint_next": "[curious] మిగతాది మీరే ప్రయత్నించండి, తర్వాత పూర్తి పరిష్కారం అడగండి.",
        "answer": "[careful] సరైన జవాబు {answer}.",
        "answer_next": "[encouraging] దశలు కావాలంటే నన్ను 'ఎందుకు' అని అడగండి.",
        "practise": "[encouraging] తర్వాత దీన్ని గట్టిగా గుర్తుంచుకోవడానికి అభ్యాసంలో ఇదే ఆలోచనపై తదుపరి ప్రశ్నను ప్రయత్నించండి.",
        "topic": "[excited] {topic} గురించి చూద్దాం.",
        "topic_next": "[encouraging] సాధన చేయాలా? అభ్యాసం తెరిచి ఈ అంశాన్ని ఎంచుకోండి.",
        "typed": "[thinking] AI లేకుండా పూర్తిగా కొత్త ప్రశ్నను పరిష్కరించలేను, కానీ దాన్ని పరిష్కరించే పద్ధతి ఇదిగో.",
        "menu": "[curious] నా నోట్స్ నుంచి వీటిని వివరించగలను: {topics}. వీటిలో ఒకటి టైప్ చేయండి, లేదా అభ్యాసం నుంచి ఒక ప్రశ్న తెరిచి దాని గురించి అడగండి.",
    },
}

# What a student types when they want only a hint, only the answer, or the full explanation.
INTENTS = {
    "hint": ("hint", "clue", "start", "संकेत", "हिंट", "शुरू", "குறிப்பு", "ஹின்ட்", "தொடங்க", "సూచన", "హింట్", "మొదలు"),
    "answer": ("answer", "which option", "correct option", "उत्तर", "जवाब", "விடை", "பதில்", "జవాబు", "సమాధానం"),
}

# (key, keywords in any of the four languages, {lang: (name, [lesson lines])})
TOPICS: list[tuple[str, tuple[str, ...], dict[str, tuple[str, list[str]]]]] = [
    (
        "profit",
        ("profit", "loss", "discount", "cost price", "selling price", "marked price", "लाभ", "हानि", "छूट", "क्रय मूल्य", "லாப", "நஷ்ட", "தள்ளுபடி", "అమ్మిన ధర", "లాభ", "నష్ట", "డిస్కౌంట్"),
        {
            "en": ("profit and loss", [
                "[thinking] Profit or loss percent is always worked out on the cost price: profit % = (SP - CP) ÷ CP × 100.",
                "[careful] A discount is taken off the marked price, not the cost price. Two discounts of a% and b% equal a + b - ab/100, never simply a + b.",
                "[playful] Example: bought for ₹200, sold for ₹250. Profit = ₹50, and 50 ÷ 200 × 100 = 25%.",
            ]),
            "hi": ("लाभ और हानि", [
                "[thinking] लाभ या हानि प्रतिशत हमेशा क्रय मूल्य पर निकाला जाता है: लाभ % = (विक्रय मूल्य - क्रय मूल्य) ÷ क्रय मूल्य × 100।",
                "[careful] छूट अंकित मूल्य पर दी जाती है, क्रय मूल्य पर नहीं। a% और b% की दो छूटें a + b - ab/100 के बराबर होती हैं, सीधे a + b नहीं।",
                "[playful] उदाहरण: ₹200 में ख़रीदा, ₹250 में बेचा। लाभ = ₹50, और 50 ÷ 200 × 100 = 25%।",
            ]),
            "ta": ("லாபமும் நஷ்டமும்", [
                "[thinking] லாப அல்லது நஷ்ட சதவீதம் எப்போதும் அடக்க விலையின் மீதே கணக்கிடப்படும்: லாப % = (விற்பனை விலை - அடக்க விலை) ÷ அடக்க விலை × 100.",
                "[careful] தள்ளுபடி குறித்த விலையின் மீது, அடக்க விலையின் மீது அல்ல. a%, b% என்ற இரண்டு தள்ளுபடிகள் a + b - ab/100-க்குச் சமம், நேரடியாக a + b அல்ல.",
                "[playful] உதாரணம்: ₹200-க்கு வாங்கி ₹250-க்கு விற்றால், லாபம் = ₹50, 50 ÷ 200 × 100 = 25%.",
            ]),
            "te": ("లాభ నష్టాలు", [
                "[thinking] లాభ లేదా నష్ట శాతం ఎప్పుడూ కొన్న ధరపైనే లెక్కిస్తారు: లాభ % = (అమ్మిన ధర - కొన్న ధర) ÷ కొన్న ధర × 100.",
                "[careful] డిస్కౌంట్ గుర్తించిన ధరపై ఉంటుంది, కొన్న ధరపై కాదు. a%, b% రెండు డిస్కౌంట్లు a + b - ab/100కు సమానం, నేరుగా a + b కాదు.",
                "[playful] ఉదాహరణ: ₹200కి కొని ₹250కి అమ్మితే లాభం = ₹50, 50 ÷ 200 × 100 = 25%.",
            ]),
        },
    ),
    (
        "interest",
        ("interest", "principal", "compound", "ब्याज", "मूलधन", "चक्रवृद्धि", "வட்டி", "அசல்", "వడ్డీ", "అసలు"),
        {
            "en": ("simple and compound interest", [
                "[thinking] Simple interest = P × R × T ÷ 100, and the amount is principal + interest.",
                "[thinking] Compound interest grows on itself: amount = P × (1 + R/100)^T. For 2 years, CI - SI = P × (R/100)².",
                "[careful] Read carefully whether the question asks for the interest or the total amount.",
            ]),
            "hi": ("साधारण और चक्रवृद्धि ब्याज", [
                "[thinking] साधारण ब्याज = P × R × T ÷ 100, और मिश्रधन = मूलधन + ब्याज।",
                "[thinking] चक्रवृद्धि ब्याज ब्याज पर भी बढ़ता है: मिश्रधन = P × (1 + R/100)^T। 2 वर्षों के लिए, CI - SI = P × (R/100)²।",
                "[careful] ध्यान से पढ़िए कि सवाल ब्याज पूछ रहा है या कुल मिश्रधन।",
            ]),
            "ta": ("தனிவட்டியும் கூட்டு வட்டியும்", [
                "[thinking] தனிவட்டி = P × R × T ÷ 100, தொகை = அசல் + வட்டி.",
                "[thinking] கூட்டு வட்டி தன் மீதே வளரும்: தொகை = P × (1 + R/100)^T. 2 ஆண்டுகளுக்கு, CI - SI = P × (R/100)².",
                "[careful] கேள்வி வட்டியைக் கேட்கிறதா, மொத்தத் தொகையைக் கேட்கிறதா என்று கவனமாகப் படியுங்கள்.",
            ]),
            "te": ("సాధారణ, చక్రవడ్డీ", [
                "[thinking] సాధారణ వడ్డీ = P × R × T ÷ 100, మొత్తం = అసలు + వడ్డీ.",
                "[thinking] చక్రవడ్డీ తన మీదే పెరుగుతుంది: మొత్తం = P × (1 + R/100)^T. 2 సంవత్సరాలకు, CI - SI = P × (R/100)².",
                "[careful] ప్రశ్న వడ్డీని అడుగుతోందా, మొత్తాన్ని అడుగుతోందా అని జాగ్రత్తగా చదవండి.",
            ]),
        },
    ),
    (
        "percent",
        ("percent", "%", "प्रतिशत", "सैकड़ा", "சதவீத", "శాతం"),
        {
            "en": ("percentages", [
                "[thinking] Percentage change = change ÷ original value × 100. Always divide by the original, not the new value.",
                "[careful] Two changes in a row multiply: up 10% then down 10% is 1.1 × 0.9 = 0.99, a 1% fall, not zero.",
                "[playful] Quick trick: 15% of 240 = 10% (24) + 5% (12) = 36.",
            ]),
            "hi": ("प्रतिशत", [
                "[thinking] प्रतिशत परिवर्तन = परिवर्तन ÷ मूल मान × 100। हमेशा मूल मान से भाग दीजिए, नए मान से नहीं।",
                "[careful] लगातार दो बदलाव गुणा होते हैं: 10% बढ़कर फिर 10% घटना = 1.1 × 0.9 = 0.99, यानी 1% कमी, शून्य नहीं।",
                "[playful] छोटी तरकीब: 240 का 15% = 10% (24) + 5% (12) = 36।",
            ]),
            "ta": ("சதவீதம்", [
                "[thinking] சதவீத மாற்றம் = மாற்றம் ÷ ஆரம்ப மதிப்பு × 100. எப்போதும் ஆரம்ப மதிப்பால் வகுக்கவும், புதிய மதிப்பால் அல்ல.",
                "[careful] அடுத்தடுத்த இரண்டு மாற்றங்கள் பெருக்கப்படும்: 10% உயர்ந்து பின் 10% குறைந்தால் 1.1 × 0.9 = 0.99, அதாவது 1% குறைவு, பூஜ்ஜியம் அல்ல.",
                "[playful] எளிய வழி: 240-இன் 15% = 10% (24) + 5% (12) = 36.",
            ]),
            "te": ("శాతాలు", [
                "[thinking] శాతం మార్పు = మార్పు ÷ అసలు విలువ × 100. ఎప్పుడూ అసలు విలువతో భాగించండి, కొత్త విలువతో కాదు.",
                "[careful] వరుసగా రెండు మార్పులు గుణించబడతాయి: 10% పెరిగి తర్వాత 10% తగ్గితే 1.1 × 0.9 = 0.99, అంటే 1% తగ్గుదల, సున్నా కాదు.",
                "[playful] చిన్న చిట్కా: 240లో 15% = 10% (24) + 5% (12) = 36.",
            ]),
        },
    ),
    (
        "speed",
        ("speed", "distance", "train", "platform", "km/h", "km", "चाल", "गति", "दूरी", "रेलगाड़ी", "ट्रेन", "வேக", "தூர", "தொலைவு", "ரயில்", "వేగ", "దూర", "రైలు"),
        {
            "en": ("speed, time and distance", [
                "[thinking] Distance = speed × time. To turn km/h into m/s, multiply by 5/18.",
                "[thinking] Trains: to pass a pole a train covers its own length; to pass a platform or another train, add the lengths. Opposite directions add speeds, same direction subtracts them.",
                "[careful] For equal distances at two speeds, average speed = 2xy ÷ (x + y), not the simple average.",
            ]),
            "hi": ("चाल, समय और दूरी", [
                "[thinking] दूरी = चाल × समय। किमी/घंटा को मी/से में बदलने के लिए 5/18 से गुणा कीजिए।",
                "[thinking] रेलगाड़ी: खंभा पार करने में वह अपनी लंबाई तय करती है; प्लेटफ़ॉर्म या दूसरी रेलगाड़ी पार करने में लंबाइयाँ जोड़िए। विपरीत दिशा में चालें जुड़ती हैं, एक दिशा में घटती हैं।",
                "[careful] दो चालों से बराबर दूरी के लिए औसत चाल = 2xy ÷ (x + y), साधारण औसत नहीं।",
            ]),
            "ta": ("வேகம், நேரம், தூரம்", [
                "[thinking] தூரம் = வேகம் × நேரம். கி.மீ/மணியை மீ/வி ஆக்க 5/18-ஆல் பெருக்கவும்.",
                "[thinking] ரயில்கள்: கம்பத்தைக் கடக்க ரயில் தன் நீளத்தைக் கடக்கும்; நடைமேடையையோ மற்றொரு ரயிலையோ கடக்க நீளங்களைக் கூட்டவும். எதிர்த் திசையில் வேகங்கள் கூடும், ஒரே திசையில் கழியும்.",
                "[careful] இரு வேகங்களில் சம தூரத்துக்குச் சராசரி வேகம் = 2xy ÷ (x + y), சாதாரண சராசரி அல்ல.",
            ]),
            "te": ("వేగం, కాలం, దూరం", [
                "[thinking] దూరం = వేగం × కాలం. కి.మీ/గంటను మీ/సెగా మార్చడానికి 5/18తో గుణించండి.",
                "[thinking] రైళ్లు: స్తంభాన్ని దాటడానికి రైలు తన పొడవును దాటుతుంది; ప్లాట్‌ఫారం లేదా మరో రైలును దాటడానికి పొడవులను కలపండి. వ్యతిరేక దిశల్లో వేగాలు కలుస్తాయి, ఒకే దిశలో తీసివేస్తాము.",
                "[careful] రెండు వేగాలతో సమాన దూరాలకు సగటు వేగం = 2xy ÷ (x + y), సాధారణ సగటు కాదు.",
            ]),
        },
    ),
    (
        "work",
        ("work", "pipe", "tank", "काम", "नल", "पाइप", "टंकी", "வேலை", "குழாய்", "தொட்டி", "పని", "పైపు", "ట్యాంకు"),
        {
            "en": ("time and work", [
                "[thinking] Turn each worker into a rate: someone who finishes in 10 days does 1/10 of the job per day. Rates add when people work together.",
                "[playful] Shortcut for two people: together they take (a × b) ÷ (a + b) days.",
                "[careful] A pipe that empties a tank does negative work, so subtract its rate. With men and days, total work = men × days stays the same.",
            ]),
            "hi": ("समय और काम", [
                "[thinking] हर व्यक्ति को एक दर में बदलिए: जो 10 दिन में काम करे, वह रोज़ काम का 1/10 करता है। साथ काम करने पर दरें जुड़ती हैं।",
                "[playful] दो लोगों के लिए शॉर्टकट: साथ में वे (a × b) ÷ (a + b) दिन लेते हैं।",
                "[careful] टंकी खाली करने वाला नल ऋणात्मक काम करता है, इसलिए उसकी दर घटाइए। आदमी और दिन वाले सवालों में कुल काम = आदमी × दिन स्थिर रहता है।",
            ]),
            "ta": ("நேரமும் வேலையும்", [
                "[thinking] ஒவ்வொருவரையும் ஒரு வேகமாக மாற்றுங்கள்: 10 நாட்களில் முடிப்பவர் நாளுக்கு வேலையின் 1/10 செய்கிறார். சேர்ந்து வேலை செய்தால் வேகங்கள் கூடும்.",
                "[playful] இருவருக்கான சுருக்கவழி: சேர்ந்து அவர்கள் (a × b) ÷ (a + b) நாட்கள் எடுப்பார்கள்.",
                "[careful] தொட்டியைக் காலியாக்கும் குழாய் எதிர்மறை வேலை செய்கிறது, எனவே அதன் வேகத்தைக் கழிக்கவும். ஆட்கள்-நாட்கள் கேள்விகளில் மொத்த வேலை = ஆட்கள் × நாட்கள் மாறாது.",
            ]),
            "te": ("కాలం, పని", [
                "[thinking] ప్రతి ఒక్కరినీ ఒక వేగంగా మార్చండి: 10 రోజుల్లో పూర్తిచేసేవారు రోజుకు పనిలో 1/10 చేస్తారు. కలిసి పనిచేస్తే వేగాలు కలుస్తాయి.",
                "[playful] ఇద్దరికి షార్ట్‌కట్: కలిసి వారు (a × b) ÷ (a + b) రోజులు తీసుకుంటారు.",
                "[careful] ట్యాంకును ఖాళీ చేసే పైపు రుణాత్మక పని చేస్తుంది, కాబట్టి దాని వేగాన్ని తీసివేయండి. మనుషులు-రోజుల ప్రశ్నల్లో మొత్తం పని = మనుషులు × రోజులు మారదు.",
            ]),
        },
    ),
    (
        "ratio",
        ("ratio", "proportion", "share", "अनुपात", "हिस्सा", "விகித", "பங்கு", "నిష్పత్తి", "వాటా"),
        {
            "en": ("ratio and proportion", [
                "[thinking] To split an amount in the ratio a:b, add the parts (a + b), find one part, then multiply.",
                "[thinking] To join A:B and B:C, make B the same in both using the LCM.",
                "[playful] Example: ₹1,200 in the ratio 3:5 → 8 parts, one part = ₹150, so the shares are ₹450 and ₹750.",
            ]),
            "hi": ("अनुपात और समानुपात", [
                "[thinking] किसी राशि को a:b में बाँटने के लिए भाग जोड़िए (a + b), एक भाग निकालिए, फिर गुणा कीजिए।",
                "[thinking] A:B और B:C को जोड़ने के लिए ल.स. से दोनों में B बराबर कीजिए।",
                "[playful] उदाहरण: ₹1,200 को 3:5 में → 8 भाग, एक भाग = ₹150, इसलिए हिस्से ₹450 और ₹750।",
            ]),
            "ta": ("விகிதமும் விகிதசமமும்", [
                "[thinking] ஒரு தொகையை a:b விகிதத்தில் பிரிக்க, பங்குகளைக் கூட்டி (a + b), ஒரு பங்கைக் கண்டு, பிறகு பெருக்கவும்.",
                "[thinking] A:B, B:C ஆகியவற்றை இணைக்க, மீ.சி.ம மூலம் இரண்டிலும் B-ஐச் சமமாக்கவும்.",
                "[playful] உதாரணம்: ₹1,200-ஐ 3:5-இல் → 8 பங்குகள், ஒரு பங்கு = ₹150, எனவே பங்குகள் ₹450, ₹750.",
            ]),
            "te": ("నిష్పత్తి, అనుపాతం", [
                "[thinking] ఒక మొత్తాన్ని a:b నిష్పత్తిలో పంచడానికి, భాగాలను కలిపి (a + b), ఒక భాగాన్ని కనుగొని, తర్వాత గుణించండి.",
                "[thinking] A:B, B:Cలను కలపడానికి, క.సా.గు ద్వారా రెండింటిలో Bని సమానం చేయండి.",
                "[playful] ఉదాహరణ: ₹1,200ను 3:5లో → 8 భాగాలు, ఒక భాగం = ₹150, కాబట్టి వాటాలు ₹450, ₹750.",
            ]),
        },
    ),
    (
        "average",
        ("average", "mean", "innings", "औसत", "पारी", "சராசரி", "இன்னிங்ஸ்", "సగటు", "ఇన్నింగ్స్"),
        {
            "en": ("averages", [
                "[thinking] Average = sum ÷ count, so sum = average × count. Most average questions are really about the sum.",
                "[thinking] When someone joins or leaves, compare the totals before and after: new total - old total gives that person's value.",
                "[playful] For evenly spaced numbers, the average is simply (first + last) ÷ 2.",
            ]),
            "hi": ("औसत", [
                "[thinking] औसत = योग ÷ संख्या, इसलिए योग = औसत × संख्या। औसत के ज़्यादातर सवाल असल में योग के बारे में होते हैं।",
                "[thinking] जब कोई जुड़ता या हटता है, पहले और बाद के कुल योग की तुलना कीजिए: नया योग - पुराना योग उस व्यक्ति का मान देता है।",
                "[playful] समान अंतराल वाली संख्याओं का औसत बस (पहली + अंतिम) ÷ 2 होता है।",
            ]),
            "ta": ("சராசரி", [
                "[thinking] சராசரி = கூடுதல் ÷ எண்ணிக்கை, எனவே கூடுதல் = சராசரி × எண்ணிக்கை. பெரும்பாலான சராசரிக் கேள்விகள் உண்மையில் கூடுதலைப் பற்றியவை.",
                "[thinking] ஒருவர் சேரும்போதோ விலகும்போதோ, முன்னும் பின்னும் உள்ள மொத்தங்களை ஒப்பிடுங்கள்: புதிய மொத்தம் - பழைய மொத்தம் அவரது மதிப்பைத் தரும்.",
                "[playful] சம இடைவெளி எண்களுக்குச் சராசரி வெறும் (முதல் + கடைசி) ÷ 2.",
            ]),
            "te": ("సగటు", [
                "[thinking] సగటు = మొత్తం ÷ సంఖ్య, కాబట్టి మొత్తం = సగటు × సంఖ్య. సగటు ప్రశ్నలు చాలావరకు నిజానికి మొత్తం గురించే.",
                "[thinking] ఎవరైనా చేరినప్పుడు లేదా వెళ్లినప్పుడు, ముందు, తర్వాత మొత్తాలను పోల్చండి: కొత్త మొత్తం - పాత మొత్తం ఆ వ్యక్తి విలువ.",
                "[playful] సమాన అంతరం గల సంఖ్యల సగటు కేవలం (మొదటిది + చివరిది) ÷ 2.",
            ]),
        },
    ),
    (
        "mixture",
        ("mixture", "alligation", "milk", "water", "मिश्रण", "दूध", "கலவை", "பால்", "మిశ్రమ", "పాలు"),
        {
            "en": ("mixtures and alligation", [
                "[thinking] Alligation: cheaper : dearer = (dearer price - mean) : (mean - cheaper price).",
                "[thinking] When water is added, the milk doesn't change. Use the milk to find the new amount of water.",
                "[careful] Repeated replacement: what's left = original × (1 - removed/total)^times.",
            ]),
            "hi": ("मिश्रण और एलिगेशन", [
                "[thinking] एलिगेशन: सस्ता : महँगा = (महँगा मूल्य - औसत) : (औसत - सस्ता मूल्य)।",
                "[thinking] पानी मिलाने पर दूध नहीं बदलता। पानी की नई मात्रा दूध से निकालिए।",
                "[careful] बार-बार बदलने पर बचा भाग = मूल × (1 - निकाला/कुल)^बार।",
            ]),
            "ta": ("கலவையும் கலவை விதியும்", [
                "[thinking] கலவை விதி: மலிவானது : விலை உயர்ந்தது = (உயர்ந்த விலை - சராசரி) : (சராசரி - மலிவான விலை).",
                "[thinking] தண்ணீர் சேர்க்கும்போது பால் மாறாது. புதிய தண்ணீர் அளவைப் பாலைக் கொண்டு கண்டறியுங்கள்.",
                "[careful] மீண்டும் மீண்டும் மாற்றினால் மீதம் = ஆரம்பம் × (1 - எடுத்தது/மொத்தம்)^முறைகள்.",
            ]),
            "te": ("మిశ్రమాలు, మిశ్రమ నియమం", [
                "[thinking] మిశ్రమ నియమం: చౌకది : ఖరీదైనది = (ఖరీదైన ధర - సగటు) : (సగటు - చౌక ధర).",
                "[thinking] నీరు కలిపినప్పుడు పాలు మారవు. కొత్త నీటి పరిమాణాన్ని పాలతో కనుగొనండి.",
                "[careful] పదేపదే మార్చితే మిగిలేది = అసలు × (1 - తీసింది/మొత్తం)^సార్లు.",
            ]),
        },
    ),
    (
        "probability",
        ("probability", "dice", "die", "coin", "cards", "प्रायिकता", "पासा", "सिक्का", "पत्ता", "நிகழ்தகவு", "பகடை", "நாணய", "சீட்டு", "సంభావ్యత", "పాచిక", "నాణే", "కార్డు"),
        {
            "en": ("probability", [
                "[thinking] Probability = favourable outcomes ÷ all equally likely outcomes.",
                "[thinking] Two dice give 36 outcomes, three coins give 8, a deck has 52 cards (13 of each suit, 12 face cards).",
                "[careful] For 'at least one', use 1 - P(none). Without replacement, the second draw has one item fewer.",
            ]),
            "hi": ("प्रायिकता", [
                "[thinking] प्रायिकता = अनुकूल परिणाम ÷ सभी समान संभावना वाले परिणाम।",
                "[thinking] दो पासों के 36 परिणाम होते हैं, तीन सिक्कों के 8, और गड्डी में 52 पत्ते (हर रंग के 13, तस्वीर वाले 12)।",
                "[careful] 'कम से कम एक' के लिए 1 - P(एक भी नहीं) लगाइए। बिना वापस रखे निकालने पर दूसरी बार एक चीज़ कम होती है।",
            ]),
            "ta": ("நிகழ்தகவு", [
                "[thinking] நிகழ்தகவு = சாதகமான விளைவுகள் ÷ எல்லா சம வாய்ப்புள்ள விளைவுகள்.",
                "[thinking] இரண்டு பகடைகள் 36 விளைவுகள், மூன்று நாணயங்கள் 8, ஒரு கட்டில் 52 சீட்டுகள் (ஒவ்வொரு வகையிலும் 13, முக அட்டைகள் 12).",
                "[careful] 'குறைந்தது ஒன்று' என்பதற்கு 1 - P(ஒன்றும் இல்லை). திருப்பி வைக்காமல் எடுத்தால், இரண்டாவது முறை ஒரு பொருள் குறைவு.",
            ]),
            "te": ("సంభావ్యత", [
                "[thinking] సంభావ్యత = అనుకూల ఫలితాలు ÷ అన్ని సమాన అవకాశం గల ఫలితాలు.",
                "[thinking] రెండు పాచికలకు 36 ఫలితాలు, మూడు నాణేలకు 8, పేకలో 52 కార్డులు (ప్రతి రకంలో 13, బొమ్మ కార్డులు 12).",
                "[careful] 'కనీసం ఒకటి' కోసం 1 - P(ఏదీ లేకపోవడం). తిరిగి పెట్టకుండా తీస్తే, రెండోసారి ఒక వస్తువు తక్కువ.",
            ]),
        },
    ),
    (
        "counting",
        ("arrange", "arrangement", "permutation", "combination", "committee", "how many ways", "क्रमचय", "संचय", "समिति", "तरीक", "வரிசைமாற்ற", "சேர்வு", "வழிகளில்", "ప్రస్తార", "సంయోగ", "విధాలు", "కమిటీ"),
        {
            "en": ("permutations and combinations", [
                "[thinking] If order matters (arranging, ranking), multiply the choices: n × (n - 1) × … For all n items that's n!.",
                "[thinking] If order doesn't matter (choosing a team), use C(n, r) = n! ÷ (r! × (n - r)!).",
                "[careful] Around a round table use (n - 1)!, and for words with repeated letters divide by the repeats' factorials.",
            ]),
            "hi": ("क्रमचय और संचय", [
                "[thinking] अगर क्रम मायने रखता है (व्यवस्था, रैंक), तो विकल्पों को गुणा कीजिए: n × (n - 1) × … सभी n चीज़ों के लिए n!।",
                "[thinking] अगर क्रम मायने नहीं रखता (टीम चुनना), तो C(n, r) = n! ÷ (r! × (n - r)!) लगाइए।",
                "[careful] गोल मेज़ पर (n - 1)! लगाइए, और दोहराए अक्षरों वाले शब्दों में दोहराव के फ़ैक्टोरियल से भाग दीजिए।",
            ]),
            "ta": ("வரிசைமாற்றமும் சேர்வும்", [
                "[thinking] வரிசை முக்கியம் என்றால் (அமைத்தல், தரவரிசை), தேர்வுகளைப் பெருக்கவும்: n × (n - 1) × … எல்லா n பொருட்களுக்கும் n!.",
                "[thinking] வரிசை முக்கியமில்லை என்றால் (அணி தேர்வு), C(n, r) = n! ÷ (r! × (n - r)!) பயன்படுத்தவும்.",
                "[careful] வட்ட மேசைக்கு (n - 1)!, மீண்டும் வரும் எழுத்துகள் உள்ள சொற்களுக்கு அவற்றின் காரணிப் பெருக்கத்தால் வகுக்கவும்.",
            ]),
            "te": ("ప్రస్తారాలు, సంయోగాలు", [
                "[thinking] క్రమం ముఖ్యమైతే (అమర్చడం, ర్యాంకు), ఎంపికలను గుణించండి: n × (n - 1) × … అన్ని n వస్తువులకు n!.",
                "[thinking] క్రమం ముఖ్యం కాకపోతే (జట్టు ఎంపిక), C(n, r) = n! ÷ (r! × (n - r)!) వాడండి.",
                "[careful] గుండ్రని బల్లకు (n - 1)!, పునరావృత అక్షరాలున్న పదాలకు వాటి ఫ్యాక్టోరియల్‌తో భాగించండి.",
            ]),
        },
    ),
    (
        "numbers",
        ("remainder", "divisible", "unit digit", "hcf", "lcm", "factor", "prime", "शेषफल", "विभाज्य", "इकाई अंक", "ल.स.", "म.स.", "अभाज्य", "மீதி", "வகுபடும்", "மீ.சி.ம", "மீ.பொ.வ", "பகா", "శేషం", "భాగించబడ", "క.సా.గు", "గ.సా.భా", "ప్రధాన సంఖ్య"),
        {
            "en": ("the number system", [
                "[thinking] Divisibility: by 3 or 9 if the digit sum is, by 4 if the last two digits are, by 11 if the alternating digit sum is.",
                "[thinking] Unit digits and remainders of powers repeat in short cycles; find the cycle, then divide the power by its length.",
                "[careful] For two numbers, HCF × LCM = their product. LCM takes the highest power of each prime, HCF the lowest common power.",
            ]),
            "hi": ("संख्या पद्धति", [
                "[thinking] विभाज्यता: अंकों का योग 3 या 9 से विभाज्य हो तो संख्या भी; अंतिम दो अंक 4 से विभाज्य हों तो 4 से; एकांतर अंकों का अंतर 11 से विभाज्य हो तो 11 से।",
                "[thinking] घातों के इकाई अंक और शेषफल छोटे चक्रों में दोहराते हैं; चक्र ढूँढिए, फिर घात को चक्र की लंबाई से भाग दीजिए।",
                "[careful] दो संख्याओं के लिए म.स. × ल.स. = उनका गुणनफल। ल.स. में हर अभाज्य की सबसे बड़ी घात, म.स. में उभयनिष्ठ सबसे छोटी घात।",
            ]),
            "ta": ("எண் முறை", [
                "[thinking] வகுபடுதன்மை: இலக்கக் கூடுதல் 3 அல்லது 9-ஆல் வகுபட்டால் எண்ணும் வகுபடும்; கடைசி இரண்டு இலக்கங்கள் 4-ஆல் வகுபட்டால் 4-ஆல்; மாற்று இலக்க வேறுபாடு 11-ஆல் வகுபட்டால் 11-ஆல்.",
                "[thinking] அடுக்குகளின் ஒன்றாம் இட இலக்கங்களும் மீதிகளும் சிறு சுழற்சிகளில் மீண்டும் வரும்; சுழற்சியைக் கண்டு, அடுக்கை அதன் நீளத்தால் வகுக்கவும்.",
                "[careful] இரண்டு எண்களுக்கு, மீ.பொ.வ × மீ.சி.ம = அவற்றின் பெருக்கல். மீ.சி.ம ஒவ்வொரு பகா எண்ணின் உயர்ந்த அடுக்கையும், மீ.பொ.வ பொதுவான குறைந்த அடுக்கையும் எடுக்கும்.",
            ]),
            "te": ("సంఖ్యా వ్యవస్థ", [
                "[thinking] భాజ్యత: అంకెల మొత్తం 3 లేదా 9తో భాగించబడితే సంఖ్య కూడా; చివరి రెండు అంకెలు 4తో భాగించబడితే 4తో; ఏకాంతర అంకెల తేడా 11తో భాగించబడితే 11తో.",
                "[thinking] ఘాతాల ఒకట్ల అంకెలు, శేషాలు చిన్న చక్రాల్లో మళ్లీ వస్తాయి; చక్రాన్ని కనుగొని, ఘాతాన్ని దాని పొడవుతో భాగించండి.",
                "[careful] రెండు సంఖ్యలకు, గ.సా.భా × క.సా.గు = వాటి లబ్ధం. క.సా.గు ప్రతి ప్రధాన సంఖ్య యొక్క అత్యధిక ఘాతాన్ని, గ.సా.భా ఉమ్మడి అత్యల్ప ఘాతాన్ని తీసుకుంటాయి.",
            ]),
        },
    ),
    (
        "series",
        ("series", "next number", "next term", "pattern", "श्रेणी", "अगली संख्या", "தொடர்", "அடுத்த எண்", "శ్రేణి", "తదుపరి సంఖ్య"),
        {
            "en": ("number series", [
                "[thinking] Start with the differences between terms. If they are equal, it's arithmetic; if they grow steadily, look at the differences of the differences.",
                "[thinking] Also check for ×2, ×3, squares, cubes, primes, or two series mixed in the odd and even places.",
                "[playful] Example: 2, 6, 12, 20, 30 → differences 4, 6, 8, 10, so the next is 30 + 12 = 42.",
            ]),
            "hi": ("संख्या श्रेणी", [
                "[thinking] पदों के बीच के अंतर से शुरू कीजिए। अंतर बराबर हों तो समांतर श्रेणी है; लगातार बढ़ें तो अंतरों के अंतर देखिए।",
                "[thinking] ×2, ×3, वर्ग, घन, अभाज्य संख्याएँ, या विषम-सम स्थानों में मिली दो श्रेणियाँ भी जाँचिए।",
                "[playful] उदाहरण: 2, 6, 12, 20, 30 → अंतर 4, 6, 8, 10, इसलिए अगला 30 + 12 = 42।",
            ]),
            "ta": ("எண் தொடர்", [
                "[thinking] உறுப்புகளுக்கு இடையிலான வேறுபாடுகளிலிருந்து தொடங்குங்கள். அவை சமம் என்றால் கூட்டுத் தொடர்; சீராக வளர்ந்தால் வேறுபாடுகளின் வேறுபாடுகளைப் பாருங்கள்.",
                "[thinking] ×2, ×3, வர்க்கங்கள், கனங்கள், பகா எண்கள், அல்லது ஒற்றை-இரட்டை இடங்களில் கலந்த இரண்டு தொடர்களையும் சரிபாருங்கள்.",
                "[playful] உதாரணம்: 2, 6, 12, 20, 30 → வேறுபாடுகள் 4, 6, 8, 10, எனவே அடுத்தது 30 + 12 = 42.",
            ]),
            "te": ("సంఖ్యా శ్రేణి", [
                "[thinking] పదాల మధ్య తేడాలతో మొదలుపెట్టండి. అవి సమానమైతే అంకశ్రేణి; క్రమంగా పెరిగితే తేడాల తేడాలను చూడండి.",
                "[thinking] ×2, ×3, వర్గాలు, ఘనాలు, ప్రధాన సంఖ్యలు, లేదా బేసి-సరి స్థానాల్లో కలిసిన రెండు శ్రేణులను కూడా పరిశీలించండి.",
                "[playful] ఉదాహరణ: 2, 6, 12, 20, 30 → తేడాలు 4, 6, 8, 10, కాబట్టి తదుపరిది 30 + 12 = 42.",
            ]),
        },
    ),
    (
        "relations",
        ("relation", "related", "father", "mother", "brother", "sister", "uncle", "nephew", "संबंध", "पिता", "माँ", "भाई", "बहन", "உறவு", "தந்தை", "தாய்", "சகோதர", "సంబంధ", "తండ్రి", "తల్లి", "సోదర"),
        {
            "en": ("blood relations", [
                "[thinking] Draw a small family tree: generations as rows, + for male, - for female, a line for marriage.",
                "[thinking] Work from the speaker outwards, one link at a time: 'my mother's brother' is my maternal uncle, and his child is my cousin.",
                "[careful] Watch for traps like 'only son' or 'only daughter', which often point back to the speaker or a parent.",
            ]),
            "hi": ("रक्त संबंध", [
                "[thinking] एक छोटा परिवार-वृक्ष बनाइए: पीढ़ियाँ पंक्तियों में, पुरुष के लिए +, महिला के लिए -, विवाह के लिए एक रेखा।",
                "[thinking] बोलने वाले से शुरू करके एक-एक कड़ी आगे बढ़िए: 'मेरी माँ का भाई' मेरा मामा है, और उसकी संतान मेरा ममेरा भाई-बहन।",
                "[careful] 'इकलौता बेटा' या 'इकलौती बेटी' जैसे जालों पर ध्यान दीजिए, जो अक्सर बोलने वाले या उसके माता-पिता की ओर ही इशारा करते हैं।",
            ]),
            "ta": ("இரத்த உறவுகள்", [
                "[thinking] ஒரு சிறிய குடும்ப மரம் வரையுங்கள்: தலைமுறைகள் வரிசைகளாக, ஆணுக்கு +, பெண்ணுக்கு -, திருமணத்துக்கு ஒரு கோடு.",
                "[thinking] பேசுபவரிடமிருந்து ஒவ்வொரு இணைப்பாக முன்னேறுங்கள்: 'என் அம்மாவின் சகோதரர்' என் தாய்மாமா, அவரது பிள்ளை எனக்கு ஒன்றுவிட்ட சகோதரர்/சகோதரி.",
                "[careful] 'ஒரே மகன்', 'ஒரே மகள்' போன்ற பொறிகளைக் கவனியுங்கள்; அவை பெரும்பாலும் பேசுபவரையோ பெற்றோரையோ குறிக்கும்.",
            ]),
            "te": ("రక్త సంబంధాలు", [
                "[thinking] ఒక చిన్న కుటుంబ వృక్షం గీయండి: తరాలను వరుసలుగా, పురుషుడికి +, స్త్రీకి -, వివాహానికి ఒక గీత.",
                "[thinking] మాట్లాడేవారి నుంచి ఒక్కో లింకుగా ముందుకు వెళ్లండి: 'మా అమ్మ సోదరుడు' నా మేనమామ, అతని సంతానం నాకు వరుసకు సోదరుడు/సోదరి.",
                "[careful] 'ఏకైక కొడుకు', 'ఏకైక కూతురు' వంటి ఉచ్చులను గమనించండి; అవి తరచుగా మాట్లాడేవారినో తల్లిదండ్రులనో సూచిస్తాయి.",
            ]),
        },
    ),
    (
        "directions",
        ("direction", "north", "south", "east", "west", "turns left", "turns right", "दिशा", "उत्तर", "दक्षिण", "पूर्व", "पश्चिम", "திசை", "வடக்கு", "தெற்கு", "கிழக்கு", "மேற்கு", "దిశ", "ఉత్తర", "దక్షిణ", "తూర్పు", "పడమర"),
        {
            "en": ("direction sense", [
                "[thinking] Sketch it: start at (0, 0) with north up and east right, and track the facing direction after every turn.",
                "[thinking] A right turn moves clockwise (N → E → S → W); a left turn moves anticlockwise.",
                "[careful] Distance from the start uses Pythagoras: √(x² + y²). The total path walked is a common trap.",
            ]),
            "hi": ("दिशा ज्ञान", [
                "[thinking] चित्र बनाइए: (0, 0) से शुरू कीजिए, उत्तर ऊपर और पूर्व दाएँ, और हर मोड़ के बाद मुँह की दिशा लिखते जाइए।",
                "[thinking] दाएँ मुड़ना दक्षिणावर्त है (उ → पू → द → प); बाएँ मुड़ना वामावर्त।",
                "[careful] आरंभ बिंदु से दूरी पाइथागोरस से: √(x² + y²)। कुल चली गई दूरी एक आम जाल है।",
            ]),
            "ta": ("திசை அறிவு", [
                "[thinking] படம் வரையுங்கள்: (0, 0)-இல் தொடங்கி, வடக்கு மேலே, கிழக்கு வலப்புறம்; ஒவ்வொரு திருப்பத்துக்குப் பிறகும் நோக்கும் திசையைக் குறியுங்கள்.",
                "[thinking] வலப்புறம் திரும்புவது கடிகாரத் திசை (வ → கி → தெ → மே); இடப்புறம் திரும்புவது எதிர்த் திசை.",
                "[careful] தொடக்கத்திலிருந்து தொலைவுக்குப் பித்தாகரஸ்: √(x² + y²). மொத்தமாக நடந்த தூரம் ஒரு பொதுவான பொறி.",
            ]),
            "te": ("దిశా జ్ఞానం", [
                "[thinking] చిత్రం గీయండి: (0, 0) నుంచి మొదలుపెట్టి, ఉత్తరం పైకి, తూర్పు కుడికి; ప్రతి మలుపు తర్వాత చూసే దిశను రాసుకోండి.",
                "[thinking] కుడికి తిరగడం సవ్యదిశ (ఉ → తూ → ద → ప); ఎడమకు తిరగడం అపసవ్యదిశ.",
                "[careful] ప్రారంభం నుంచి దూరానికి పైథాగరస్: √(x² + y²). మొత్తం నడిచిన దూరం ఒక సాధారణ ఉచ్చు.",
            ]),
        },
    ),
    (
        "clocks",
        ("clock", "angle", "hands", "o'clock", "घड़ी", "सुई", "कोण", "கடிகார", "முள்", "கோண", "గడియార", "ముల్లు", "కోణ"),
        {
            "en": ("clocks", [
                "[thinking] The minute hand moves 6° a minute; the hour hand moves 30° an hour plus 0.5° a minute.",
                "[thinking] Angle at H:M = |30H - 5.5M|. If it's over 180°, subtract it from 360° for the smaller angle.",
                "[careful] The hands meet every 65 5/11 minutes, because the minute hand gains 5.5° per minute.",
            ]),
            "hi": ("घड़ी", [
                "[thinking] मिनट की सुई हर मिनट 6° चलती है; घंटे की सुई हर घंटे 30° और हर मिनट 0.5° चलती है।",
                "[thinking] H:M पर कोण = |30H - 5.5M|। 180° से ज़्यादा हो तो छोटे कोण के लिए 360° से घटाइए।",
                "[careful] दोनों सुइयाँ हर 65 5/11 मिनट में मिलती हैं, क्योंकि मिनट की सुई हर मिनट 5.5° आगे निकलती है।",
            ]),
            "ta": ("கடிகாரம்", [
                "[thinking] நிமிட முள் நிமிடத்துக்கு 6° நகரும்; மணி முள் மணிக்கு 30°, கூடவே நிமிடத்துக்கு 0.5° நகரும்.",
                "[thinking] H:M-இல் கோணம் = |30H - 5.5M|. 180°-க்கு மேல் என்றால், சிறிய கோணத்துக்கு 360°-இலிருந்து கழிக்கவும்.",
                "[careful] நிமிட முள் நிமிடத்துக்கு 5.5° முன்னேறுவதால், முட்கள் ஒவ்வொரு 65 5/11 நிமிடத்துக்கும் சந்திக்கின்றன.",
            ]),
            "te": ("గడియారాలు", [
                "[thinking] నిమిషాల ముల్లు నిమిషానికి 6° కదులుతుంది; గంటల ముల్లు గంటకు 30°, దానితో పాటు నిమిషానికి 0.5° కదులుతుంది.",
                "[thinking] H:M వద్ద కోణం = |30H - 5.5M|. 180° కంటే ఎక్కువైతే, చిన్న కోణం కోసం 360° నుంచి తీసివేయండి.",
                "[careful] నిమిషాల ముల్లు నిమిషానికి 5.5° ముందుకు వెళ్తుంది కాబట్టి, ముళ్లు ప్రతి 65 5/11 నిమిషాలకు కలుస్తాయి.",
            ]),
        },
    ),
    (
        "calendars",
        ("calendar", "day of the week", "weekday", "leap year", "odd days", "कैलेंडर", "सप्ताह का", "लीप", "நாள்காட்டி", "கிழமை", "லீப்", "క్యాలెండర్", "వారంలో ఏ రోజు", "లీపు"),
        {
            "en": ("calendars", [
                "[thinking] Only the 'odd days' matter: the remainder when the number of days is divided by 7.",
                "[thinking] An ordinary year has 1 odd day, a leap year 2. A year is a leap year if divisible by 4, except century years not divisible by 400.",
                "[careful] Count February carefully: 29 days in a leap year is the most common slip.",
            ]),
            "hi": ("कैलेंडर", [
                "[thinking] केवल 'विषम दिन' मायने रखते हैं: दिनों की संख्या को 7 से भाग देने पर बचा शेषफल।",
                "[thinking] साधारण वर्ष में 1 विषम दिन होता है, लीप वर्ष में 2। जो वर्ष 4 से विभाज्य हो वह लीप वर्ष है, सिवाय उन शताब्दी वर्षों के जो 400 से विभाज्य नहीं।",
                "[careful] फ़रवरी ध्यान से गिनिए: लीप वर्ष में 29 दिन भूल जाना सबसे आम गलती है।",
            ]),
            "ta": ("நாள்காட்டி", [
                "[thinking] 'மீதி நாட்கள்' மட்டுமே முக்கியம்: நாட்களின் எண்ணிக்கையை 7-ஆல் வகுக்கும்போது வரும் மீதி.",
                "[thinking] சாதாரண ஆண்டில் 1 மீதி நாள், லீப் ஆண்டில் 2. 4-ஆல் வகுபடும் ஆண்டு லீப் ஆண்டு, 400-ஆல் வகுபடாத நூற்றாண்டு ஆண்டுகள் தவிர.",
                "[careful] பிப்ரவரியைக் கவனமாக எண்ணுங்கள்: லீப் ஆண்டில் 29 நாட்களை மறப்பதே அதிகம் நடக்கும் தவறு.",
            ]),
            "te": ("క్యాలెండర్", [
                "[thinking] 'బేసి రోజులు' మాత్రమే ముఖ్యం: రోజుల సంఖ్యను 7తో భాగించినప్పుడు వచ్చే శేషం.",
                "[thinking] సాధారణ సంవత్సరంలో 1 బేసి రోజు, లీపు సంవత్సరంలో 2. 4తో భాగించబడే సంవత్సరం లీపు సంవత్సరం, 400తో భాగించబడని శతాబ్ది సంవత్సరాలు తప్ప.",
                "[careful] ఫిబ్రవరిని జాగ్రత్తగా లెక్కించండి: లీపు సంవత్సరంలో 29 రోజులను మర్చిపోవడమే సాధారణ పొరపాటు.",
            ]),
        },
    ),
    (
        "syllogisms",
        ("syllogism", "statement", "conclusion", "assumption", "कथन", "निष्कर्ष", "पूर्वधारणा", "கூற்று", "முடிவு", "அனுமான", "ప్రవచన", "నిర్ధారణ", "ఊహ"),
        {
            "en": ("statements and conclusions", [
                "[thinking] Draw each group as a circle. 'All A are B' puts A inside B; 'No A is B' keeps them apart; 'Some' means they overlap.",
                "[thinking] A conclusion follows only if it is true in every possible drawing, not just one.",
                "[careful] Two 'some' statements never give a definite conclusion, and 'Some A are B' can always be flipped to 'Some B are A'.",
            ]),
            "hi": ("कथन और निष्कर्ष", [
                "[thinking] हर समूह को एक घेरे की तरह बनाइए। 'सभी A, B हैं' का अर्थ है A, B के अंदर; 'कोई A, B नहीं' का अर्थ है दोनों अलग; 'कुछ' का अर्थ है वे आपस में मिलते हैं।",
                "[thinking] निष्कर्ष तभी निकलता है जब वह हर संभव चित्र में सच हो, केवल एक में नहीं।",
                "[careful] दो 'कुछ' वाले कथनों से कभी निश्चित निष्कर्ष नहीं निकलता, और 'कुछ A, B हैं' को हमेशा 'कुछ B, A हैं' में उलटा जा सकता है।",
            ]),
            "ta": ("கூற்றுகளும் முடிவுகளும்", [
                "[thinking] ஒவ்வொரு குழுவையும் ஒரு வட்டமாக வரையுங்கள். 'எல்லா A-யும் B' என்றால் A, B-க்குள்; 'எந்த A-யும் B அல்ல' என்றால் இரண்டும் தனித்தனி; 'சில' என்றால் அவை ஒன்றின் மேல் ஒன்று வரும்.",
                "[thinking] ஒரு முடிவு, சாத்தியமான எல்லாப் படங்களிலும் உண்மையாக இருந்தால் மட்டுமே பின்தொடரும்; ஒன்றில் மட்டும் அல்ல.",
                "[careful] இரண்டு 'சில' கூற்றுகள் ஒருபோதும் உறுதியான முடிவைத் தராது; 'சில A, B' என்பதை எப்போதும் 'சில B, A' எனத் திருப்பலாம்.",
            ]),
            "te": ("ప్రవచనాలు, నిర్ధారణలు", [
                "[thinking] ప్రతి సమూహాన్ని ఒక వృత్తంగా గీయండి. 'అన్ని A లు B' అంటే A, B లోపల; 'ఏ A కూడా B కాదు' అంటే రెండూ వేర్వేరు; 'కొన్ని' అంటే అవి కలుస్తాయి.",
                "[thinking] ఒక నిర్ధారణ సాధ్యమైన ప్రతి చిత్రంలోనూ నిజమైతేనే వస్తుంది, ఒక్కదాంట్లో మాత్రమే కాదు.",
                "[careful] రెండు 'కొన్ని' ప్రవచనాల నుంచి ఎప్పుడూ ఖచ్చితమైన నిర్ధారణ రాదు; 'కొన్ని A లు B' ని ఎప్పుడూ 'కొన్ని B లు A' గా తిరగేయవచ్చు.",
            ]),
        },
    ),
    (
        "coding",
        ("coded", "code", "decoding", "कोड", "कूट", "குறியீ", "కోడ్"),
        {
            "en": ("coding and decoding", [
                "[thinking] Write the alphabet positions (A=1 … Z=26) and compare each letter with its code letter.",
                "[thinking] Common rules: a fixed shift forward or back, a shift that grows by one each letter, the mirror letter (A↔Z, sum 27), or the word reversed first.",
                "[careful] Check your rule on every letter before applying it, and remember the alphabet wraps from Z back to A.",
            ]),
            "hi": ("कूटलेखन और कूटवाचन", [
                "[thinking] वर्णमाला के स्थान लिखिए (A=1 … Z=26) और हर अक्षर की तुलना उसके कोड अक्षर से कीजिए।",
                "[thinking] आम नियम: आगे या पीछे तय खिसकाव, हर अक्षर पर एक-एक बढ़ता खिसकाव, दर्पण अक्षर (A↔Z, योग 27), या पहले शब्द को उल्टा करना।",
                "[careful] नियम लगाने से पहले उसे हर अक्षर पर जाँचिए, और याद रखिए कि वर्णमाला Z के बाद फिर A पर आती है।",
            ]),
            "ta": ("குறியீடும் குறிவிலக்கலும்", [
                "[thinking] எழுத்துவரிசை இடங்களை எழுதுங்கள் (A=1 … Z=26), ஒவ்வொரு எழுத்தையும் அதன் குறியீட்டு எழுத்துடன் ஒப்பிடுங்கள்.",
                "[thinking] பொதுவான விதிகள்: முன்னோ பின்னோ நிலையான நகர்வு, ஒவ்வொரு எழுத்துக்கும் ஒன்று கூடும் நகர்வு, எதிர் எழுத்து (A↔Z, கூடுதல் 27), அல்லது முதலில் சொல்லைத் தலைகீழாக்குதல்.",
                "[careful] விதியைப் பயன்படுத்தும் முன் ஒவ்வொரு எழுத்திலும் சரிபாருங்கள்; Z-க்குப் பின் எழுத்துவரிசை மீண்டும் A-க்கு வரும் என்பதை நினைவில் கொள்ளுங்கள்.",
            ]),
            "te": ("కోడింగ్, డీకోడింగ్", [
                "[thinking] వర్ణమాల స్థానాలను రాయండి (A=1 … Z=26), ప్రతి అక్షరాన్ని దాని కోడ్ అక్షరంతో పోల్చండి.",
                "[thinking] సాధారణ నియమాలు: ముందుకు లేదా వెనక్కి స్థిరమైన జరుపు, ప్రతి అక్షరానికి ఒకటి పెరిగే జరుపు, ప్రతిబింబ అక్షరం (A↔Z, మొత్తం 27), లేదా ముందుగా పదాన్ని తిరగేయడం.",
                "[careful] నియమాన్ని వాడే ముందు ప్రతి అక్షరంపై సరిచూడండి; Z తర్వాత వర్ణమాల మళ్లీ Aకి వస్తుందని గుర్తుంచుకోండి.",
            ]),
        },
    ),
    (
        "seating",
        ("seating", "sit in a row", "row", "rank", "from the left", "पंक्ति", "बैठ", "स्थान पर", "வரிசை", "இருக்கை", "அமர்ந்", "వరుస", "కూర్చు", "ర్యాంకు"),
        {
            "en": ("seating and ranking", [
                "[thinking] Number the seats 1, 2, 3… from the left and place the fixed people first (ends, middle, exact positions).",
                "[thinking] Then add the 'immediately left/right' clues, and try each remaining option against the 'not next to' clues.",
                "[careful] Ranks: position from the top + position from the bottom = total + 1.",
            ]),
            "hi": ("बैठक व्यवस्था और रैंकिंग", [
                "[thinking] सीटों को बाएँ से 1, 2, 3… नंबर दीजिए और पहले तय लोगों को बैठाइए (छोर, बीच, ठीक स्थान)।",
                "[thinking] फिर 'ठीक बाएँ/दाएँ' वाले संकेत जोड़िए, और बचे विकल्पों को 'बगल में नहीं' वाले संकेतों पर जाँचिए।",
                "[careful] रैंक: ऊपर से स्थान + नीचे से स्थान = कुल + 1।",
            ]),
            "ta": ("இருக்கை அமைப்பும் தரவரிசையும்", [
                "[thinking] இருக்கைகளை இடமிருந்து 1, 2, 3… என எண்ணி, உறுதியானவர்களை முதலில் அமர்த்துங்கள் (முனைகள், நடு, சரியான இடங்கள்).",
                "[thinking] பிறகு 'உடனடி இடம்/வலம்' குறிப்புகளைச் சேர்த்து, மீதமுள்ள வாய்ப்புகளை 'அருகில் இல்லை' குறிப்புகளுடன் சரிபாருங்கள்.",
                "[careful] தரவரிசை: மேலிருந்து இடம் + கீழிருந்து இடம் = மொத்தம் + 1.",
            ]),
            "te": ("సీటింగ్, ర్యాంకింగ్", [
                "[thinking] సీట్లకు ఎడమ నుంచి 1, 2, 3… అని నంబర్లు ఇచ్చి, స్థిరమైన వారిని ముందుగా కూర్చోబెట్టండి (చివర్లు, మధ్య, ఖచ్చితమైన స్థానాలు).",
                "[thinking] తర్వాత 'వెంటనే ఎడమ/కుడి' సూచనలను జోడించి, మిగిలిన ఎంపికలను 'పక్కన లేరు' సూచనలతో సరిచూడండి.",
                "[careful] ర్యాంకులు: పై నుంచి స్థానం + కింది నుంచి స్థానం = మొత్తం + 1.",
            ]),
        },
    ),
    (
        "verbal",
        ("synonym", "antonym", "idiom", "grammar", "vocabulary", "meaning", "समानार्थी", "विलोम", "मुहावरा", "व्याकरण", "ஒத்த சொல்", "எதிர்ச்சொல்", "மரபுத்தொடர்", "இலக்கண", "పర్యాయ", "వ్యతిరేక", "జాతీయం", "వ్యాకరణ"),
        {
            "en": ("verbal ability", [
                "[thinking] Break words into roots: bene = good, mal = bad, bi = two, poly = many, phobia = fear. Many hard words become guessable.",
                "[thinking] In sentence correction, find the real subject first, ignoring phrases like 'of the students' or 'along with', then match the verb to it.",
                "[careful] Options that only sound like the word (ethereal vs ephemeral) are deliberate traps.",
            ]),
            "hi": ("मौखिक योग्यता (अंग्रेज़ी)", [
                "[thinking] शब्दों को मूल भागों में तोड़िए: bene = अच्छा, mal = बुरा, bi = दो, poly = कई, phobia = डर। कई कठिन शब्दों का अर्थ अंदाज़ा लगाया जा सकता है।",
                "[thinking] वाक्य सुधार में पहले असली कर्ता ढूँढिए, 'of the students' या 'along with' जैसे वाक्यांश छोड़कर, फिर क्रिया उसी से मिलाइए।",
                "[careful] जो विकल्प केवल सुनने में मिलते-जुलते हैं (ethereal बनाम ephemeral), वे जानबूझकर रखे गए जाल हैं।",
            ]),
            "ta": ("மொழித் திறன் (ஆங்கிலம்)", [
                "[thinking] சொற்களை வேர்களாகப் பிரியுங்கள்: bene = நல்ல, mal = கெட்ட, bi = இரண்டு, poly = பல, phobia = பயம். பல கடினச் சொற்களின் பொருளை ஊகிக்கலாம்.",
                "[thinking] வாக்கியத் திருத்தத்தில், 'of the students', 'along with' போன்ற சொற்றொடர்களை விட்டு, முதலில் உண்மையான எழுவாயைக் கண்டு, வினையை அதனுடன் பொருத்துங்கள்.",
                "[careful] ஒலியில் மட்டுமே ஒத்திருக்கும் விடைகள் (ethereal vs ephemeral) வேண்டுமென்றே வைக்கப்பட்ட பொறிகள்.",
            ]),
            "te": ("భాషా నైపుణ్యం (ఇంగ్లీష్)", [
                "[thinking] పదాలను మూలాలుగా విడదీయండి: bene = మంచి, mal = చెడు, bi = రెండు, poly = చాలా, phobia = భయం. చాలా కఠిన పదాల అర్థాన్ని ఊహించవచ్చు.",
                "[thinking] వాక్య సవరణలో, 'of the students', 'along with' వంటి పదబంధాలను వదిలి, ముందుగా నిజమైన కర్తను కనుగొని, క్రియను దానితో సరిపోల్చండి.",
                "[careful] వినడానికి మాత్రమే దగ్గరగా ఉండే ఎంపికలు (ethereal vs ephemeral) కావాలని పెట్టిన ఉచ్చులు.",
            ]),
        },
    ),
]

_ASCII = re.compile(r"^[\x00-\x7f]+$")


def _mentions(text: str, keyword: str) -> bool:
    # English keywords match whole words ("rank" shouldn't fire on "frankly"); Indian scripts match inside
    # words, because case endings attach to them (சதவீதம், சதவீதத்தை).
    if _ASCII.match(keyword):
        return re.search(rf"(?<![a-z]){re.escape(keyword)}(?:s|es)?(?![a-z])", text) is not None
    return keyword in text


def topic_for(text: str) -> str | None:
    text = text.lower()
    for key, keywords, _ in TOPICS:
        if any(_mentions(text, k.lower()) for k in keywords):
            return key
    return None


def _intent(text: str) -> str:
    text = text.lower()
    for intent, words in INTENTS.items():
        if any(_mentions(text, w) for w in words):
            return intent
    return "solve"


def reply(learner, history: list[tuple[str, str]], help: Help | None = None) -> str:
    """The whole offline reply, with an [emotion] tag before every sentence."""
    lang = learner.locale if learner.locale in PHRASES else "en"
    say = PHRASES[lang]
    help = help or Help()
    name = learner.tutor_name or "Asha"
    message = history[-1][1] if history else ""
    first = not any(role == "tutor" for role, _ in history[:-1])
    # Hindi verbs agree with the tutor's gender; the other languages ignore this.
    can = "सकता" if getattr(learner, "tutor_gender", "female") == "male" else "सकती"
    lines: list[str] = []
    if first:
        lines.append(say["intro"].format(name=name, can=can))

    if help.solution:
        intent = _intent(message)
        steps = [s for s in help.solution.split("\n") if s.strip()]
        if intent == "hint" and len(steps) > 1:
            lines += [say["hint"], f"[careful] {steps[0]}", say["hint_next"]]
        elif intent == "answer" and help.answer:
            lines += [say["answer"].format(answer=help.answer), say["answer_next"]]
        else:
            lines += [say["solution"], *(f"[careful] {s}" for s in steps), say["practise"]]
        return "\n".join(lines)

    topic = topic_for(f"{help.question_text or ''} {message}")
    if topic:
        card = next(cards for key, _, cards in TOPICS if key == topic)
        title, body = card.get(lang, card["en"])
        lines.append(say["typed"].format(can=can) if help.question_text else say["topic"].format(topic=title))
        lines += body
        lines.append(say["topic_next"])
        return "\n".join(lines)

    titles = ", ".join(cards.get(lang, cards["en"])[0] for _, _, cards in TOPICS)
    lines.append(say["menu"].format(topics=titles, can=can))
    return "\n".join(lines)
