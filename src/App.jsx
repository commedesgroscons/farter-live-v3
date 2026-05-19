import { useEffect, useMemo, useState } from "react";
import { isConfigured, supabase } from "./supabase";

const demoPosts = [
  {
    id: "demo-1",
    username: "@BassDestroyer",
    score: 94,
    tier: "Nuclear Grade",
    duration: "4.8s",
    reactions: 1264
  },
  {
    id: "demo-2",
    username: "@SilentPressure",
    score: 87,
    tier: "Thunderclass",
    duration: "3.2s",
    reactions: 804
  },
  {
    id: "demo-3",
    username: "@RoomTone",
    score: 61,
    tier: "Air Strike",
    duration: "2.1s",
    reactions: 190
  }
];

const demoMessages = [
  { id: "m1", username: "@nocturnal", content: "94 is insane." },
  { id: "m2", username: "@lowfreq", content: "Need a duel after that." },
  { id: "m3", username: "@parisgas", content: "chat is moving crazy tonight." }
];

function getTier(score) {
  if (score >= 92) return "Nuclear Grade";
  if (score >= 80) return "Thunderclass";
  if (score >= 68) return "Air Strike";
  return "Low Pressure";
}

function Wave({ score }) {
  const bars = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const curve = Math.sin(i / 2.1) * 18;
      const random = Math.random() * 45;
      return Math.max(8, Math.min(58, random + curve + score / 8));
    });
  }, [score]);

  return (
    <div className="wave">
      {bars.map((height, index) => (
        <span key={index} style={{ height: `${height}px` }} />
      ))}
    </div>
  );
}

export default function App() {
  const [entered, setEntered] = useState(false);
  const [posts, setPosts] = useState(demoPosts);
  const [messages, setMessages] = useState(demoMessages);
  const [chatText, setChatText] = useState("");
  const [error, setError] = useState("");
  const [duel, setDuel] = useState({
    a: "@DeepRoom",
    b: "@GasDealer",
    aScore: 89,
    bScore: 91,
    aVotes: 214,
    bVotes: 241,
    round: 2
  });

  const liveCount = 12842 + posts.length * 23;

  useEffect(() => {
    if (!isConfigured) {
      setError("Supabase is not configured in Vercel.");
      return;
    }

    loadData();

    const postsChannel = supabase
      .channel("posts-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          setPosts((prev) => [
            payload.new,
            ...prev.filter((p) => p.id !== payload.new.id)
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          setPosts((prev) =>
            prev.map((p) => (p.id === payload.new.id ? payload.new : p))
          );
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("messages-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new].slice(-80));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  async function loadData() {
    const postsResult = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsResult.error) {
      setError(postsResult.error.message);
      return;
    }

    if (postsResult.data && postsResult.data.length > 0) {
      setPosts(postsResult.data);
    }

    const messagesResult = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(80);

    if (messagesResult.error) {
      setError(messagesResult.error.message);
      return;
    }

    if (messagesResult.data && messagesResult.data.length > 0) {
      setMessages(messagesResult.data);
    }
  }

  async function dropAudio() {
    setError("");

    const score = Math.floor(58 + Math.random() * 42);

    const newPost = {
      username: "@you",
      score,
      tier: getTier(score),
      duration: `${(1.4 + Math.random() * 4.8).toFixed(1)}s`,
      reactions: 0
    };

    if (!isConfigured) {
      setPosts((prev) => [{ id: crypto.randomUUID(), ...newPost }, ...prev]);
      return;
    }

    const result = await supabase.from("posts").insert(newPost);

    if (result.error) {
      setError(result.error.message);
    }
  }

  async function sendMessage() {
    setError("");

    const content = chatText.trim();

    if (!content) return;

    setChatText("");

    const newMessage = {
      username: "@you",
      content
    };

    if (!isConfigured) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), ...newMessage }
      ]);
      return;
    }

    const result = await supabase.from("messages").insert(newMessage);

    if (result.error) {
      setError(result.error.message);
    }
  }

  async function reactPost(post) {
    setError("");

    const updatedReactions = (post.reactions || 0) + 1;

    if (!isConfigured || String(post.id).startsWith("demo")) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, reactions: updatedReactions } : p
        )
      );
      return;
    }

    const result = await supabase
      .from("posts")
      .update({ reactions: updatedReactions })
      .eq("id", post.id);

    if (result.error) {
      setError(result.error.message);
    }
  }

  function startDuel() {
    setDuel({
      a: "@you",
      b: "@Challenger",
      aScore: Math.floor(70 + Math.random() * 29),
      bScore: Math.floor(70 + Math.random() * 29),
      aVotes: Math.floor(100 + Math.random() * 200),
      bVotes: Math.floor(100 + Math.random() * 200),
      round: 1
    });

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        username: "System",
        content: "@you started a 3-round duel. The room is voting."
      }
    ]);
  }

  function voteDuel(side) {
    setDuel((prev) => ({
      ...prev,
      aVotes: side === "a" ? prev.aVotes + 1 : prev.aVotes,
      bVotes: side === "b" ? prev.bVotes + 1 : prev.bVotes
    }));
  }

  const rankedPosts = [...posts]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);

  const totalVotes = duel.aVotes + duel.bVotes;

  if (!entered) {
    return (
      <main className="landing">
        <nav className="nav">
          <div className="brand">
            <div className="logo">F</div>
            FARTER
          </div>

          <div className="navLinks">
            <span>Live room</span>
            <span>Duels</span>
            <span>Leaderboards</span>
            <span>Verified audio</span>
          </div>
        </nav>

        <section className="hero">
          <div className="livePill">
            <i />
            {liveCount.toLocaleString()} people live right now
          </div>

          <h1>Humanity's first real-time gas network.</h1>

          <p>
            Join one global room. Drop verified audio. React, vote, duel, and
            climb the daily, weekly and monthly rankings.
          </p>

          <div className="buttons">
            <button className="primary" onClick={() => setEntered(true)}>
              ENTER THE ROOM
            </button>

            <button className="secondary" onClick={() => setEntered(true)}>
              View leaderboard
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="appHeader">
        <div className="brand">
          <div className="logo">F</div>

          <div>
            FARTER
            <small>Global room · {liveCount.toLocaleString()} live</small>
          </div>
        </div>

        <div className="headerActions">
          <button className="ghost" onClick={startDuel}>
            Start duel
          </button>

          <button className="primary compact" onClick={dropAudio}>
            Drop audio
          </button>
        </div>
      </header>

      {error && <div className="errorBox">{error}</div>}

      <div className="grid">
        <aside className="left">
          <section className="panel">
            <div className="panelTitle">
              <h2>🏆 Leaderboard</h2>
            </div>

            {rankedPosts.map((post, index) => (
              <div className="rankRow" key={post.id}>
                <div className="rankLeft">
                  <span className="rankNo">{index + 1}</span>

                  <div>
                    <strong>{post.username}</strong>
                    <p>{post.tier}</p>
                  </div>
                </div>

                <b>{post.score}</b>
              </div>
            ))}
          </section>

          <section className="panel">
            <div className="panelTitle">
              <h2>⚔️ Duel live</h2>
              <span className="pillLight">Round {duel.round} / 3</span>
            </div>

            <div className="duelGrid">
              <button className="duelBox" onClick={() => voteDuel("a")}>
                <span>{duel.a}</span>
                <strong>{duel.aScore}</strong>

                <div className="meter">
                  <i style={{ width: `${(duel.aVotes / totalVotes) * 100}%` }} />
                </div>

                <small>{duel.aVotes} votes</small>
              </button>

              <button className="duelBox" onClick={() => voteDuel("b")}>
                <span>{duel.b}</span>
                <strong>{duel.bScore}</strong>

                <div className="meter">
                  <i style={{ width: `${(duel.bVotes / totalVotes) * 100}%` }} />
                </div>

                <small>{duel.bVotes} votes</small>
              </button>
            </div>

            <p className="microcopy">
              Each player gets 3 chances. The global chat votes after every
              round.
            </p>
          </section>
        </aside>

        <section className="feed">
          <div className="roomIntro">
            <div>
              <h1>Global live room</h1>
              <p>One chat. One feed. Everyone live.</p>
            </div>

            <span>Live feed</span>
          </div>

          {posts.map((post) => (
            <article className="post" key={post.id}>
              <div className="postTop">
                <div>
                  <div className="eyebrow">
                    <i />
                    Live drop
                  </div>

                  <h3>{post.username}</h3>
                  <p>
                    {post.tier} · {post.duration}
                  </p>
                </div>

                <div className="score">
                  <span>Fart Score</span>
                  <strong>{post.score}</strong>
                </div>
              </div>

              <div className="player">
                <button className="play">▶</button>
                <Wave score={post.score || 60} />
              </div>

              <div className="reactions">
                <button onClick={() => reactPost(post)}>
                  💀 {post.reactions || 0}
                </button>

                <button onClick={() => reactPost(post)}>🔥 Fire</button>
                <button onClick={() => reactPost(post)}>☣️ Toxic</button>
                <button onClick={() => reactPost(post)}>Vote</button>
              </div>
            </article>
          ))}
        </section>

        <aside className="chat">
          <div className="chatHeader">
            <h2>Live chat</h2>
            <p>Everyone in the same room.</p>
          </div>

          <div className="chatMessages">
            {messages.map((message) => (
              <div className="bubble" key={message.id}>
                <span>{message.username}</span>
                {message.content}
              </div>
            ))}
          </div>

          <div className="chatInput">
            <input
              value={chatText}
              onChange={(event) => setChatText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendMessage();
              }}
              placeholder="Say something..."
            />

            <button onClick={sendMessage}>➤</button>
          </div>
        </aside>
      </div>
    </main>
  );
}
