const {
  useState,
  useEffect,
  useRef
} = React;
const LEVELS = ['Open', 'Beginner', 'Low-Int', 'Intermediate', 'High-Int', 'Advanced'];
const LEVEL_SHORT = {
  'Open': 'OPEN',
  'Beginner': 'BEG',
  'Low-Int': 'L-INT',
  'Intermediate': 'INT',
  'High-Int': 'H-INT',
  'Advanced': 'ADV'
};
const LEVEL_IDX = {
  'Open': -1,
  'Beginner': 0,
  'Low-Int': 1,
  'Intermediate': 2,
  'High-Int': 3,
  'Advanced': 4
};
const BADGE_CLASS = {
  'Open': 'badge-open',
  'Beginner': 'badge-beg',
  'Low-Int': 'badge-li',
  'Intermediate': 'badge-int',
  'High-Int': 'badge-hi',
  'Advanced': 'badge-adv'
};
const TIME_OPTIONS = [15, 20, 24, 30];
const MATCH_MODES = ['Same Level', 'Skill Based', 'Open Level', 'OP Multi Group', 'OP Meet', 'Manual'];
// ── PIN authentication ──────────────────────────────────────────────────
// The Superadmin PIN (72890) is never stored in plaintext — only its hash
// is kept here, and every login attempt is hashed the same way before
// comparing. Uses a simple synchronous hash (not crypto.subtle) so it keeps
// working even when this file is opened directly (file://) or served over
// plain HTTP, where the Web Crypto API's secure-context requirement can
// make crypto.subtle unavailable.
const SUPERADMIN_PIN_HASH = '0bfea48f';
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
let nextId = 200;
const uid = () => `p${nextId++}`;
const INIT_PLAYERS = [{
  id: uid(),
  name: 'Alex',
  level: 'Beginner',
  partnerId: null,
  gender: 'M'
}, {
  id: uid(),
  name: 'Sam',
  level: 'Beginner',
  partnerId: null,
  gender: 'F'
}, {
  id: uid(),
  name: 'Jordan',
  level: 'Low-Int',
  partnerId: null,
  gender: 'M'
}, {
  id: uid(),
  name: 'Casey',
  level: 'Low-Int',
  partnerId: null,
  gender: 'F'
}, {
  id: uid(),
  name: 'Riley',
  level: 'High-Int',
  partnerId: null,
  gender: 'M'
}, {
  id: uid(),
  name: 'Morgan',
  level: 'High-Int',
  partnerId: null,
  gender: 'F'
}, {
  id: uid(),
  name: 'Taylor',
  level: 'Advanced',
  partnerId: null,
  gender: 'M'
}, {
  id: uid(),
  name: 'Drew',
  level: 'Advanced',
  partnerId: null,
  gender: 'M'
}, {
  id: uid(),
  name: 'Jamie',
  level: 'Beginner',
  partnerId: null,
  gender: 'F'
}, {
  id: uid(),
  name: 'Quinn',
  level: 'Low-Int',
  partnerId: null,
  gender: 'M'
}];

// Restore the last working session (players, waitlist, courts, history) from
// localStorage so a page refresh doesn't wipe out live data. This is separate
// from the explicit "Save Session" / "Load Session" feature, which snapshots
// named sessions the user chooses to keep.
const loadLiveState = () => {
  try {
    const raw = localStorage.getItem('dr_live_state');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

function LevelBadge({
  level
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: `badge ${BADGE_CLASS[level] || 'badge-beg'}`
  }, LEVEL_SHORT[level] || level);
}
function GenderTag({
  gender
}) {
  if (gender === 'F') return /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      color: '#f06292',
      background: '#2a0818',
      border: '1px solid #e91e6344',
      borderRadius: 20,
      padding: '1px 6px',
      flexShrink: 0
    }
  }, "♀");
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      color: '#64b5f6',
      background: '#0d2040',
      border: '1px solid #2196f344',
      borderRadius: 20,
      padding: '1px 6px',
      flexShrink: 0
    }
  }, "♂");
}
function CourtTimer({
  startTime,
  limitMin
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startTime]);
  const limit = limitMin * 60;
  const rem = limit - elapsed;
  const absRem = Math.abs(rem);
  const min = Math.floor(absRem / 60).toString().padStart(2, '0');
  const sec = (absRem % 60).toString().padStart(2, '0');
  const cls = rem < 0 ? 'timer-over' : rem < 120 ? 'timer-warn' : 'timer-ok';
  return /*#__PURE__*/React.createElement("span", {
    className: `court-timer ${cls}`
  }, rem < 0 ? '-' : '', min, ":", sec);
}
// Shows a live-updating "actual" wait duration for a player sitting in the
// waitlist, counted from the moment they joined (or rejoined) the queue.
function WaitTimer({
  since
}) {
  const [elapsed, setElapsed] = useState(() => Math.max(0, Math.floor((Date.now() - since) / 1000)));
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - since) / 1000))), 1000);
    return () => clearInterval(iv);
  }, [since]);
  const min = Math.floor(elapsed / 60);
  const sec = (elapsed % 60).toString().padStart(2, '0');
  return /*#__PURE__*/React.createElement("span", {
    className: "wait-timer",
    style: {
      fontSize: 11,
      color: 'var(--text-muted)',
      fontWeight: 600,
      whiteSpace: 'nowrap'
    },
    title: "Time waited since joining the queue"
  }, "⏱ ", min, "m ", sec, "s");
}
function PlayerListTab({
  playerList,
  setPlayerList,
  playerListSearch,
  setPlayerListSearch,
  queue,
  setQueue,
  courts,
  showNotif,
  exportPlayerListXLSX,
  importPlayerListXLSX,
  addingPair,
  setAddingPair,
  newName,
  setNewName,
  newLevel,
  setNewLevel,
  newGender,
  setNewGender,
  newPartnerName,
  setNewPartnerName,
  newPartnerLevel,
  setNewPartnerLevel,
  newPartnerGender,
  setNewPartnerGender,
  matchMode,
  playGroups,
  newGroup,
  setNewGroup,
  newPartnerGroup,
  setNewPartnerGroup,
  teams,
  newTeam,
  setNewTeam,
  newPartnerTeam,
  setNewPartnerTeam,
  addPlayer,
  onJoin
}) {
  const [plEditId, setPlEditId] = useState(null);
  const [plEditName, setPlEditName] = useState('');
  const [plEditLevel, setPlEditLevel] = useState('Open');
  const [plEditGroup, setPlEditGroup] = useState('');
  const [plEditTeam, setPlEditTeam] = useState('');
  const [plEditGender, setPlEditGender] = useState('M');
  // Group/Team sub-tab filter (mirrors the Waitlist tab's filter pills).
  const [plGroupFilter, setPlGroupFilter] = useState(null);
  const [plTeamFilter, setPlTeamFilter] = useState(null);
  let filtered = playerList.filter(p => !playerListSearch.trim() || p.name.toLowerCase().includes(playerListSearch.trim().toLowerCase()));
  if (matchMode === 'OP Multi Group' && plGroupFilter) {
    filtered = filtered.filter(p => plGroupFilter === '__unassigned__' ? !p.group : p.group === plGroupFilter);
  }
  if (matchMode === 'OP Meet' && plTeamFilter) {
    filtered = filtered.filter(p => plTeamFilter === '__unassigned__' ? !p.team : p.team === plTeamFilter);
  }
  const addToWaitlist = p => {
    if (queue.some(q => q.id === p.id || q.name.toLowerCase() === p.name.toLowerCase())) {
      showNotif(`${p.name} is already in the waitlist`);
      return;
    }
    if (onJoin) onJoin(p.id);
    setQueue(prev => [...prev, {
      ...p,
      queuedAt: Date.now()
    }]);
    showNotif(`${p.name} added to Waitlist!`);
  };
  const removeFromPlayerList = id => {
    setPlayerList(prev => prev.filter(p => p.id !== id));
    // Also remove from waitlist (queue), unlinking any fixed partner
    setQueue(prev => {
      const target = prev.find(p => p.id === id);
      if (!target) return prev;
      const without = prev.filter(p => p.id !== id);
      if (target.partnerId) {
        return without.map(p => p.id === target.partnerId ? {
          ...p,
          partnerId: null
        } : p);
      }
      return without;
    });
  };
  const saveEdit = id => {
    if (!plEditName.trim()) return;
    const onCourtNow = courts.some(c => c.players && [...c.players.teamA, ...c.players.teamB].some(x => x.id === id));
    if (onCourtNow) {
      setPlEditId(null);
      showNotif('Cannot edit — player is currently in a game. Wait until their game ends.');
      return;
    }
    const trimmed = plEditName.trim();
    setPlayerList(prev => prev.map(p => p.id === id ? {
      ...p,
      name: trimmed,
      level: plEditLevel,
      gender: plEditGender,
      ...(matchMode === 'OP Multi Group' ? { group: plEditGroup || null } : {}),
      ...(matchMode === 'OP Meet' ? { team: plEditTeam || null } : {})
    } : p));
    // Player List is the single place edits are made — propagate the same
    // change into the live Waitlist entry (if this player is queued).
    // (Court propagation isn't needed: saveEdit refuses to run at all while
    // the player is on a court — see the onCourtNow guard above.)
    setQueue(prev => prev.map(p => p.id === id ? {
      ...p,
      name: trimmed,
      level: plEditLevel,
      gender: plEditGender,
      ...(matchMode === 'OP Multi Group' ? { group: plEditGroup || null } : {}),
      ...(matchMode === 'OP Meet' ? { team: plEditTeam || null } : {})
    } : p));
    setPlEditId(null);
    showNotif('Player updated!');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "two-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      flexWrap: 'wrap',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title",
    style: {
      marginBottom: 0
    }
  }, "Master Player List — ", playerList.length, " players"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: exportPlayerListXLSX,
    disabled: playerList.length === 0,
    title: "Export player list to Excel",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      border: '1px solid var(--green)',
      color: 'var(--green)',
      opacity: playerList.length === 0 ? 0.4 : 1
    }
  }, "⬇ Excel"), /*#__PURE__*/React.createElement("label", {
    title: "Load players into Player List and Waitlist from Excel (.xlsx)",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '5px 10px',
      borderRadius: 'var(--r)',
      fontSize: 11,
      fontWeight: 600,
      cursor: 'pointer',
      background: 'var(--surface3)',
      border: '1px solid var(--teal)',
      color: 'var(--teal)'
    }
  }, "⬆ Load", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".xlsx,.xls",
    onChange: importPlayerListXLSX,
    style: {
      display: 'none'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-muted)',
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, "This is your master roster. Add players here, then click ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--green)'
    }
  }, "+ Waitlist"), " to put them in today's queue. Removing from the waitlist does not remove them from this list."), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 9,
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: 13,
      color: 'var(--text-dim)',
      pointerEvents: 'none'
    }
  }, "🔍"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Search player…",
    value: playerListSearch,
    onChange: e => setPlayerListSearch(e.target.value),
    style: {
      paddingLeft: 30,
      background: 'var(--surface3)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 12,
      color: 'var(--text-main)',
      width: '100%'
    }
  }), playerListSearch && /*#__PURE__*/React.createElement("button", {
    onClick: () => setPlayerListSearch(''),
    style: {
      position: 'absolute',
      right: 8,
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: 'var(--text-dim)',
      cursor: 'pointer',
      fontSize: 14,
      lineHeight: 1,
      padding: 0
    }
  }, "✕")), matchMode === 'OP Multi Group' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPlGroupFilter(null),
    style: {
      padding: '4px 10px',
      borderRadius: 20,
      border: `1px solid ${!plGroupFilter ? 'var(--teal)' : 'var(--border)'}`,
      background: !plGroupFilter ? 'var(--teal-dim, rgba(0,150,150,0.15))' : 'transparent',
      color: !plGroupFilter ? 'var(--teal)' : 'var(--text-muted)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "All (", playerList.length, ")"), playGroups.map(g => {
    const count = playerList.filter(p => p.group === g.id).length;
    return /*#__PURE__*/React.createElement("button", {
      key: g.id,
      onClick: () => setPlGroupFilter(g.id),
      style: {
        padding: '4px 10px',
        borderRadius: 20,
        border: `1px solid ${plGroupFilter === g.id ? 'var(--teal)' : 'var(--border)'}`,
        background: plGroupFilter === g.id ? 'var(--teal-dim, rgba(0,150,150,0.15))' : 'transparent',
        color: plGroupFilter === g.id ? 'var(--teal)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, "🏟 ", g.name, " (", count, ")");
  }), (() => {
    const unassignedCount = playerList.filter(p => !p.group).length;
    if (!unassignedCount) return null;
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => setPlGroupFilter('__unassigned__'),
      style: {
        padding: '4px 10px',
        borderRadius: 20,
        border: `1px solid ${plGroupFilter === '__unassigned__' ? 'var(--red)' : 'var(--border)'}`,
        background: plGroupFilter === '__unassigned__' ? 'rgba(255,0,0,0.1)' : 'transparent',
        color: plGroupFilter === '__unassigned__' ? 'var(--red)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, "No Group (", unassignedCount, ")");
  })()), matchMode === 'OP Meet' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPlTeamFilter(null),
    style: {
      padding: '4px 10px',
      borderRadius: 20,
      border: `1px solid ${!plTeamFilter ? 'var(--purple, #9c27b0)' : 'var(--border)'}`,
      background: !plTeamFilter ? 'rgba(156,39,176,0.15)' : 'transparent',
      color: !plTeamFilter ? 'var(--purple, #9c27b0)' : 'var(--text-muted)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "All (", playerList.length, ")"), teams.map(t => {
    const count = playerList.filter(p => p.team === t.id).length;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setPlTeamFilter(t.id),
      style: {
        padding: '4px 10px',
        borderRadius: 20,
        border: `1px solid ${plTeamFilter === t.id ? 'var(--purple, #9c27b0)' : 'var(--border)'}`,
        background: plTeamFilter === t.id ? 'rgba(156,39,176,0.15)' : 'transparent',
        color: plTeamFilter === t.id ? 'var(--purple, #9c27b0)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, "🤝 ", t.name, " (", count, ")");
  }), (() => {
    const unassignedCount = playerList.filter(p => !p.team).length;
    if (!unassignedCount) return null;
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => setPlTeamFilter('__unassigned__'),
      style: {
        padding: '4px 10px',
        borderRadius: 20,
        border: `1px solid ${plTeamFilter === '__unassigned__' ? 'var(--red)' : 'var(--border)'}`,
        background: plTeamFilter === '__unassigned__' ? 'rgba(255,0,0,0.1)' : 'transparent',
        color: plTeamFilter === '__unassigned__' ? 'var(--red)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, "No Team (", unassignedCount, ")");
  })()), filtered.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, playerList.length === 0 ? 'No players yet. Add some →' : 'No players match search.') : /*#__PURE__*/React.createElement("div", {
    className: "queue-list",
    style: {
      maxHeight: 480
    }
  }, filtered.map((p, idx) => {
    const inQueue = queue.some(q => q.id === p.id);
    const onCourt = courts.some(c => c.players && [...c.players.teamA, ...c.players.teamB].find(x => x.id === p.id));
    const isEditing = plEditId === p.id;
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: "queue-item"
    }, /*#__PURE__*/React.createElement("span", {
      className: "queue-num"
    }, idx + 1), !isEditing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GenderTag, {
      gender: p.gender
    }), /*#__PURE__*/React.createElement(LevelBadge, {
      level: p.level
    }), /*#__PURE__*/React.createElement("span", {
      className: "queue-name"
    }, p.name), matchMode === 'OP Multi Group' && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: p.group ? 'var(--teal)' : 'var(--red)',
        background: p.group ? 'var(--teal-dim, rgba(0,150,150,0.15))' : 'rgba(255,0,0,0.12)',
        borderRadius: 10,
        padding: '1px 6px',
        flexShrink: 0,
        whiteSpace: 'nowrap'
      }
    }, "🏟 ", p.group ? playGroups.find(s => s.id === p.group)?.name || '—' : 'No group'), matchMode === 'OP Meet' && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: p.team ? 'var(--purple, #9c27b0)' : 'var(--red)',
        background: p.team ? 'rgba(156,39,176,0.15)' : 'rgba(255,0,0,0.12)',
        borderRadius: 10,
        padding: '1px 6px',
        flexShrink: 0,
        whiteSpace: 'nowrap'
      }
    }, "🤝 ", p.team ? teams.find(t => t.id === p.team)?.name || '—' : 'No team'), inQueue && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: 'var(--gold)',
        background: 'var(--gold-dim)',
        borderRadius: 10,
        padding: '1px 6px',
        flexShrink: 0
      }
    }, "In Queue"), onCourt && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: 'var(--green)',
        background: 'var(--green-dim)',
        borderRadius: 10,
        padding: '1px 6px',
        flexShrink: 0
      }
    }, "On Court"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        marginLeft: 'auto',
        flexShrink: 0
      }
    }, !inQueue && !onCourt && /*#__PURE__*/React.createElement("button", {
      className: "btn btn-green btn-sm",
      onClick: () => addToWaitlist(p),
      title: "Add to today's waitlist"
    }, "+ Waitlist"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost btn-sm",
      disabled: onCourt,
      style: onCourt ? {
        opacity: 0.35,
        cursor: 'not-allowed'
      } : undefined,
      onClick: () => {
        if (onCourt) {
          showNotif('Cannot edit — player is currently in a game. Wait until their game ends.');
          return;
        }
        setPlEditId(p.id);
        setPlEditName(p.name);
        setPlEditLevel(p.level);
        setPlEditGender(p.gender);
        setPlEditGroup(p.group || '');
        setPlEditTeam(p.team || '');
      },
      title: onCourt ? 'Cannot edit while player is in a game' : 'Edit'
    }, "✏️"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost btn-sm",
      style: {
        color: 'var(--red)'
      },
      onClick: () => removeFromPlayerList(p.id),
      title: "Remove from list"
    }, "✕"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
      value: plEditName,
      onChange: e => setPlEditName(e.target.value),
      style: {
        flex: 1,
        fontSize: 12,
        padding: '4px 8px'
      },
      autoFocus: true,
      onKeyDown: e => e.key === 'Enter' && saveEdit(p.id)
    }), /*#__PURE__*/React.createElement("select", {
      value: plEditLevel,
      onChange: e => setPlEditLevel(e.target.value),
      style: {
        fontSize: 12,
        padding: '4px 6px',
        width: 'auto'
      }
    }, LEVELS.map(l => /*#__PURE__*/React.createElement("option", {
      key: l,
      value: l
    }, l))), matchMode === 'OP Multi Group' && /*#__PURE__*/React.createElement("select", {
      value: plEditGroup,
      onChange: e => setPlEditGroup(e.target.value),
      style: {
        fontSize: 12,
        padding: '4px 6px',
        width: 'auto'
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "No group"), playGroups.map(s => /*#__PURE__*/React.createElement("option", {
      key: s.id,
      value: s.id
    }, s.name))), matchMode === 'OP Meet' && /*#__PURE__*/React.createElement("select", {
      value: plEditTeam,
      onChange: e => setPlEditTeam(e.target.value),
      style: {
        fontSize: 12,
        padding: '4px 6px',
        width: 'auto'
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "No team"), teams.map(t => /*#__PURE__*/React.createElement("option", {
      key: t.id,
      value: t.id
    }, t.name))), /*#__PURE__*/React.createElement("button", {
      onClick: () => setPlEditGender(g => g === 'M' ? 'F' : 'M'),
      style: {
        background: 'var(--surface3)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        cursor: 'pointer',
        color: plEditGender === 'F' ? '#f06292' : '#64b5f6',
        fontWeight: 800,
        fontSize: 12,
        padding: '4px 8px'
      }
    }, plEditGender === 'M' ? '♂' : '♀'), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-green btn-sm",
      onClick: () => saveEdit(p.id)
    }, "✓"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost btn-sm",
      onClick: () => setPlEditId(null)
    }, "✕")));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Add Player"), /*#__PURE__*/React.createElement("div", {
    className: "add-player-form"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: `mode-btn ${!addingPair ? 'active' : ''}`,
    onClick: () => setAddingPair(false),
    style: {
      flex: 1,
      borderRadius: 6
    }
  }, "Solo Player"), /*#__PURE__*/React.createElement("button", {
    className: `mode-btn ${addingPair ? 'active' : ''}`,
    style: {
      flex: 1,
      background: addingPair ? 'var(--purple)' : 'transparent',
      borderColor: addingPair ? 'var(--purple)' : 'var(--border)',
      color: addingPair ? '#fff' : 'var(--text-muted)',
      borderRadius: 6
    },
    onClick: () => setAddingPair(true)
  }, "🔗 Fixed Pair")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface2)',
      borderRadius: 6,
      padding: '8px',
      border: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--text-muted)',
      fontWeight: 700,
      marginBottom: 5,
      textTransform: 'uppercase',
      letterSpacing: .5
    }
  }, addingPair ? 'Player 1' : 'Player'), /*#__PURE__*/React.createElement("input", {
    placeholder: "Name",
    value: newName,
    onChange: e => setNewName(e.target.value),
    onKeyDown: e => e.key === 'Enter' && addPlayer(),
    style: {
      marginBottom: 6
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: newLevel,
    onChange: e => setNewLevel(e.target.value),
    style: {
      marginBottom: 6
    }
  }, LEVELS.map(l => /*#__PURE__*/React.createElement("option", {
    key: l,
    value: l
  }, l))), matchMode === 'OP Multi Group' && /*#__PURE__*/React.createElement("select", {
    value: newGroup,
    onChange: e => setNewGroup(e.target.value),
    style: {
      marginBottom: 6,
      borderColor: !newGroup ? 'var(--red)' : undefined
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select group\u2026"), playGroups.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name))), matchMode === 'OP Meet' && /*#__PURE__*/React.createElement("select", {
    value: newTeam,
    onChange: e => setNewTeam(e.target.value),
    style: {
      marginBottom: 6,
      borderColor: !newTeam ? 'var(--red)' : undefined
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select team\u2026"), teams.map(t => /*#__PURE__*/React.createElement("option", {
    key: t.id,
    value: t.id
  }, t.name))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setNewGender('M'),
    style: {
      flex: 1,
      padding: '6px',
      borderRadius: 6,
      border: `1px solid ${newGender === 'M' ? 'var(--blue)' : 'var(--border)'}`,
      background: newGender === 'M' ? 'var(--blue-dim)' : 'transparent',
      color: newGender === 'M' ? 'var(--blue)' : 'var(--text-muted)',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "♂ Male"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setNewGender('F'),
    style: {
      flex: 1,
      padding: '6px',
      borderRadius: 6,
      border: `1px solid ${newGender === 'F' ? '#e91e63' : 'var(--border)'}`,
      background: newGender === 'F' ? '#2a0818' : 'transparent',
      color: newGender === 'F' ? '#f06292' : 'var(--text-muted)',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "♀ Female"))), addingPair && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--purple-dim)',
      borderRadius: 6,
      padding: '8px',
      border: '1px solid #9c27b055'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#ce93d8',
      fontWeight: 700,
      marginBottom: 5,
      textTransform: 'uppercase',
      letterSpacing: .5
    }
  }, "🔗 Partner (Player 2)"), /*#__PURE__*/React.createElement("input", {
    placeholder: "Partner name",
    value: newPartnerName,
    onChange: e => setNewPartnerName(e.target.value),
    onKeyDown: e => e.key === 'Enter' && addPlayer(),
    style: {
      marginBottom: 6,
      borderColor: '#9c27b055'
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: newPartnerLevel,
    onChange: e => setNewPartnerLevel(e.target.value),
    style: {
      borderColor: '#9c27b055',
      marginBottom: 6
    }
  }, LEVELS.map(l => /*#__PURE__*/React.createElement("option", {
    key: l,
    value: l
  }, l))), matchMode === 'OP Multi Group' && /*#__PURE__*/React.createElement("select", {
    value: newPartnerGroup,
    onChange: e => setNewPartnerGroup(e.target.value),
    style: {
      borderColor: !newPartnerGroup ? 'var(--red)' : '#9c27b055',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select group\u2026"), playGroups.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name))), matchMode === 'OP Meet' && /*#__PURE__*/React.createElement("select", {
    value: newPartnerTeam,
    onChange: e => setNewPartnerTeam(e.target.value),
    style: {
      borderColor: !newPartnerTeam ? 'var(--red)' : '#9c27b055',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select team\u2026"), teams.map(t => /*#__PURE__*/React.createElement("option", {
    key: t.id,
    value: t.id
  }, t.name))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setNewPartnerGender('M'),
    style: {
      flex: 1,
      padding: '6px',
      borderRadius: 6,
      border: `1px solid ${newPartnerGender === 'M' ? 'var(--blue)' : '#9c27b044'}`,
      background: newPartnerGender === 'M' ? 'var(--blue-dim)' : 'transparent',
      color: newPartnerGender === 'M' ? 'var(--blue)' : 'var(--text-muted)',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "♂ Male"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setNewPartnerGender('F'),
    style: {
      flex: 1,
      padding: '6px',
      borderRadius: 6,
      border: `1px solid ${newPartnerGender === 'F' ? '#e91e63' : '#9c27b044'}`,
      background: newPartnerGender === 'F' ? '#2a0818' : 'transparent',
      color: newPartnerGender === 'F' ? '#f06292' : 'var(--text-muted)',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "♀ Female")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#ce93d8',
      lineHeight: 1.5
    }
  }, "Fixed partners will always be placed on the same team.")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-green",
    onClick: addPlayer
  }, addingPair ? '🔗 Add Fixed Pair' : 'Add to Queue & List')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: '10px 12px',
      background: 'var(--surface2)',
      borderRadius: 8,
      border: '1px solid var(--border)',
      fontSize: 12,
      color: 'var(--text-muted)',
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: 'var(--text-main)',
      marginBottom: 4
    }
  }, "How it works"), /*#__PURE__*/React.createElement("div", null, "• Adding a player here adds them to both the master list and today's waitlist."), /*#__PURE__*/React.createElement("div", null, "• Click ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--green)'
    }
  }, "+ Waitlist"), " to re-add a player to today's queue after they were removed."), /*#__PURE__*/React.createElement("div", null, "• Edit or remove players from the master list at any time."))));
}

// Courts are now independently toggled on/off (not a contiguous "first N" range).
// MAX_COURTS matches the number of toggle buttons shown in the Courts control.
const MAX_COURTS = 7;

// Build a full MAX_COURTS-length court array from saved data, preserving each
// court's id/players/startTime and figuring out its enabled state. Handles both
// the new per-court `enabled` flag and older saves that only had a `numCourts`
// count (in which case courts 1..numCourts were considered enabled).
function normalizeCourts(savedCourts, fallbackNumCourts) {
  const list = savedCourts || [];
  const n = fallbackNumCourts ?? list.length ?? 3;
  return Array.from({ length: MAX_COURTS }, (_, i) => {
    const id = i + 1;
    const existing = list.find(c => c.id === id);
    if (existing) {
      return {
        id,
        players: existing.players ?? null,
        startTime: existing.startTime ?? null,
        enabled: existing.enabled !== undefined ? existing.enabled : id <= n
      };
    }
    return { id, players: null, startTime: null, enabled: false };
  });
}

// ── OP Multi Group: manage named groups, each with its own courts ─────────
function GroupListTab({
  playGroups,
  setPlayGroups,
  courts,
  setCourts,
  showNotif
}) {
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [courtIds, setCourtIds] = useState([]);
  const resetForm = () => {
    setEditId(null);
    setName('');
    setCourtIds([]);
  };
  const toggleCourtId = id => {
    const takenBy = playGroups.find(s => s.id !== editId && (s.courtIds || []).includes(id));
    if (takenBy && !courtIds.includes(id)) {
      showNotif(`Court ${id} is already assigned to "${takenBy.name}"`);
      return;
    }
    setCourtIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const saveGroup = () => {
    if (!name.trim()) {
      showNotif('Enter a group name');
      return;
    }
    if (!courtIds.length) {
      showNotif('Assign at least one court to this group');
      return;
    }
    const conflict = courtIds.find(id => playGroups.some(s => s.id !== editId && (s.courtIds || []).includes(id)));
    if (conflict) {
      showNotif(`Court ${conflict} is already assigned to another group`);
      return;
    }
    if (editId) {
      setPlayGroups(prev => prev.map(s => s.id === editId ? { ...s, name: name.trim(), courtIds } : s));
      showNotif(`Session "${name.trim()}" updated!`);
    } else {
      setPlayGroups(prev => [...prev, { id: uid(), name: name.trim(), courtIds }]);
      showNotif(`Session "${name.trim()}" added!`);
    }
    // Auto-enable any courts assigned to a session so they're immediately usable
    setCourts(prev => prev.map(c => courtIds.includes(c.id) ? { ...c, enabled: true } : c));
    resetForm();
  };
  const editGroup = s => {
    setEditId(s.id);
    setName(s.name);
    setCourtIds(s.courtIds || []);
  };
  const removeGroup = id => {
    setPlayGroups(prev => prev.filter(s => s.id !== id));
    if (editId === id) resetForm();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "two-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, `Groups (${playGroups.length})`), playGroups.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, "No groups yet. Add one \u2192") : /*#__PURE__*/React.createElement("div", {
    className: "queue-list"
  }, playGroups.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "queue-item"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      flex: 1
    }
  }, "\uD83C\uDFDF ", s.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-muted)',
      marginRight: 8
    }
  }, "Courts: ", (s.courtIds || []).join(', ') || '—'), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => editGroup(s),
    title: "Edit"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    style: {
      color: 'var(--red)'
    },
    onClick: () => removeGroup(s.id),
    title: "Remove"
  }, "\u2715"))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, editId ? 'Edit Group' : 'Add Group'), /*#__PURE__*/React.createElement("input", {
    placeholder: "Group Name",
    value: name,
    onChange: e => setName(e.target.value),
    onKeyDown: e => e.key === 'Enter' && saveGroup(),
    style: {
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--text-muted)',
      fontWeight: 700,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: .5
    }
  }, "Assign Courts (select multiple)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginBottom: 12
    }
  }, [1, 2, 3, 4, 5, 6, 7].map(n => {
    const takenBy = playGroups.find(s => s.id !== editId && (s.courtIds || []).includes(n));
    return /*#__PURE__*/React.createElement("button", {
      key: n,
      type: "button",
      disabled: !!takenBy,
      onClick: () => toggleCourtId(n),
      title: takenBy ? `Already assigned to "${takenBy.name}"` : undefined,
      style: {
        padding: '6px 12px',
        borderRadius: 6,
        border: `1px solid ${courtIds.includes(n) ? 'var(--teal)' : takenBy ? 'var(--red)' : 'var(--border)'}`,
        background: courtIds.includes(n) ? 'var(--teal-dim, rgba(0,150,150,0.15))' : takenBy ? 'rgba(255,0,0,0.08)' : 'transparent',
        color: courtIds.includes(n) ? 'var(--teal)' : takenBy ? 'var(--red)' : 'var(--text-muted)',
        fontWeight: 700,
        cursor: takenBy ? 'not-allowed' : 'pointer',
        opacity: takenBy ? 0.6 : 1
      }
    }, "Court ", n, takenBy ? ` (${takenBy.name})` : '');
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-green",
    style: {
      flex: 1
    },
    onClick: saveGroup
  }, editId ? 'Save Changes' : 'Add Group'), editId && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: resetForm
  }, "Cancel"))));
}

// ── OP Meet: manage named teams (players tagged to a team) ─────────────────
function TeamListTab({
  teams,
  setTeams,
  showNotif
}) {
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const resetForm = () => {
    setEditId(null);
    setName('');
  };
  const saveTeam = () => {
    if (!name.trim()) {
      showNotif('Enter a team name');
      return;
    }
    if (editId) {
      setTeams(prev => prev.map(t => t.id === editId ? { ...t, name: name.trim() } : t));
      showNotif(`Team "${name.trim()}" updated!`);
    } else {
      setTeams(prev => [...prev, { id: uid(), name: name.trim() }]);
      showNotif(`Team "${name.trim()}" added!`);
    }
    resetForm();
  };
  const editTeam = t => {
    setEditId(t.id);
    setName(t.name);
  };
  const removeTeam = id => {
    setTeams(prev => prev.filter(t => t.id !== id));
    if (editId === id) resetForm();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "two-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, `Teams (${teams.length})`), teams.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, "No teams yet. Add one \u2192") : /*#__PURE__*/React.createElement("div", {
    className: "queue-list"
  }, teams.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: "queue-item"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      flex: 1
    }
  }, "\uD83E\uDD1D ", t.name), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => editTeam(t),
    title: "Edit"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    style: {
      color: 'var(--red)'
    },
    onClick: () => removeTeam(t.id),
    title: "Remove"
  }, "\u2715"))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, editId ? 'Edit Team' : 'Add Team'), /*#__PURE__*/React.createElement("input", {
    placeholder: "Team Name",
    value: name,
    onChange: e => setName(e.target.value),
    onKeyDown: e => e.key === 'Enter' && saveTeam(),
    style: {
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-green",
    style: {
      flex: 1
    },
    onClick: saveTeam
  }, editId ? 'Save Changes' : 'Add Team'), editId && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: resetForm
  }, "Cancel"))));
}

// ── PIN login screen — blocks the whole app until a valid PIN is entered ───
function PinLoginScreen({
  onLogin,
  users
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const submit = pinValue => {
    if (!pinValue) return;
    setError('');
    const hash = simpleHash(pinValue);
    if (hash === SUPERADMIN_PIN_HASH) {
      onLogin({ id: 'superadmin', name: 'Superadmin', role: 'Superadmin' });
      return;
    }
    const match = users.find(u => u.pinHash === hash);
    if (match) {
      if (match.enabled === false) {
        setError(`${match.name}'s account is disabled`);
        setPin('');
        return;
      }
      onLogin({ id: match.id, name: match.name, role: match.role });
      return;
    }
    setError('Incorrect PIN');
    setPin('');
  };
  const press = digit => {
    if (checking) return;
    const next = (pin + digit).slice(0, 6);
    setPin(next);
    setError('');
  };
  const backspace = () => {
    if (checking) return;
    setPin(pin.slice(0, -1));
    setError('');
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'var(--bg, #0b0f14)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      gap: 20,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40
    }
  }, "🏓"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: 'var(--text-main, #fff)'
    }
  }, "Enter PIN"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      minHeight: 20
    }
  }, [0, 1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 16,
      height: 16,
      borderRadius: '50%',
      border: '2px solid var(--teal, #14b8a6)',
      background: i < pin.length ? 'var(--teal, #14b8a6)' : 'transparent'
    }
  }))), error && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--red, #ef4444)',
      fontSize: 13,
      fontWeight: 700
    }
  }, error), checking && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-muted, #888)',
      fontSize: 12
    }
  }, "Checking\u2026"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 64px)',
      gap: 10
    }
  }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '\u232B'].map((k, i) => k === '' ? /*#__PURE__*/React.createElement("div", {
    key: i
  }) : /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => k === '\u232B' ? backspace() : press(k),
    style: {
      width: 64,
      height: 64,
      borderRadius: '50%',
      border: '1px solid var(--border, #333)',
      background: 'var(--surface2, #1a1f26)',
      color: 'var(--text-main, #fff)',
      fontSize: 20,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, k))), /*#__PURE__*/React.createElement("button", {
    onClick: () => submit(pin),
    disabled: !pin || checking,
    style: {
      marginTop: 8,
      padding: '10px 28px',
      borderRadius: 8,
      border: 'none',
      background: !pin || checking ? 'var(--surface3, #2a2f36)' : 'var(--teal, #14b8a6)',
      color: !pin || checking ? 'var(--text-muted, #888)' : '#fff',
      fontSize: 14,
      fontWeight: 800,
      cursor: !pin || checking ? 'not-allowed' : 'pointer'
    }
  }, "Unlock"));
}

// ── User Management (Superadmin only) — add/edit/remove PIN-based users ───
function UserManagementTab({
  users,
  showNotif
}) {
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('Staff');
  const resetForm = () => {
    setEditId(null);
    setName('');
    setPin('');
    setRole('Staff');
  };
  const saveUser = () => {
    if (!name.trim()) {
      showNotif('Enter a name');
      return;
    }
    if (!window.fbUsers) {
      showNotif('Still connecting to the database — try again in a moment');
      return;
    }
    let hash = null;
    if (pin || !editId) {
      if (!/^\d{4,6}$/.test(pin)) {
        showNotif('PIN must be 4–6 digits');
        return;
      }
      hash = simpleHash(pin);
      if (hash === SUPERADMIN_PIN_HASH) {
        showNotif('That PIN is reserved for Superadmin — choose a different one');
        return;
      }
      const conflict = users.find(u => u.id !== editId && u.pinHash === hash);
      if (conflict) {
        showNotif(`That PIN is already used by "${conflict.name}"`);
        return;
      }
    }
    if (editId) {
      const existing = users.find(u => u.id === editId);
      window.fbUsers.upsert({ ...existing, id: editId, name: name.trim(), role, ...(hash ? { pinHash: hash } : {}) });
      showNotif(`User "${name.trim()}" updated!`);
    } else {
      window.fbUsers.upsert({ id: uid(), name: name.trim(), pinHash: hash, role, enabled: true });
      showNotif(`User "${name.trim()}" added!`);
    }
    resetForm();
  };
  const toggleUserEnabled = u => {
    if (!window.fbUsers) {
      showNotif('Still connecting to the database — try again in a moment');
      return;
    }
    window.fbUsers.upsert({ ...u, enabled: !(u.enabled !== false) });
    showNotif(`${u.name} ${u.enabled === false ? 'enabled' : 'disabled'}!`);
  };
  const editUser = u => {
    setEditId(u.id);
    setName(u.name);
    setPin('');
    setRole(u.role);
  };
  const removeUser = id => {
    if (!window.fbUsers) {
      showNotif('Still connecting to the database — try again in a moment');
      return;
    }
    window.fbUsers.remove(id);
    if (editId === id) resetForm();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "two-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, `Users (${users.length})`), /*#__PURE__*/React.createElement("div", {
    className: "queue-item",
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      flex: 1
    }
  }, "\uD83D\uDD11 Superadmin"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--text-muted)'
    }
  }, "Built-in \u00B7 PIN fixed")), users.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, "No additional users yet. Add one \u2192") : /*#__PURE__*/React.createElement("div", {
    className: "queue-list"
  }, users.map(u => {
    const isEnabled = u.enabled !== false;
    return /*#__PURE__*/React.createElement("div", {
    key: u.id,
    className: "queue-item",
    style: {
      opacity: isEnabled ? 1 : 0.55
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      flex: 1
    }
  }, "\uD83D\uDC64 ", u.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: 'var(--blue)',
      background: 'var(--blue-dim)',
      borderRadius: 10,
      padding: '1px 6px',
      marginRight: 6
    }
  }, u.role), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: isEnabled ? 'var(--green)' : 'var(--red)',
      background: isEnabled ? 'var(--green-dim)' : 'rgba(255,0,0,0.12)',
      borderRadius: 10,
      padding: '1px 6px',
      marginRight: 6
    }
  }, isEnabled ? 'Enabled' : 'Disabled'), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => toggleUserEnabled(u),
    title: isEnabled ? 'Disable this user' : 'Enable this user',
    style: {
      color: isEnabled ? 'var(--orange)' : 'var(--green)'
    }
  }, isEnabled ? '\u23F8 Disable' : '\u25B6 Enable'), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => editUser(u),
    title: "Edit"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    style: {
      color: 'var(--red)'
    },
    onClick: () => removeUser(u.id),
    title: "Remove"
  }, "\u2715"));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, editId ? 'Edit User' : 'Add User'), /*#__PURE__*/React.createElement("input", {
    placeholder: "Name",
    value: name,
    onChange: e => setName(e.target.value),
    style: {
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: editId ? "New PIN (leave blank to view unchanged)" : "PIN (4\u20136 digits)",
    value: pin,
    onChange: e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6)),
    inputMode: "numeric",
    style: {
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: role,
    onChange: e => setRole(e.target.value),
    style: {
      marginBottom: 10
    }
  }, ['Admin', 'Staff'].map(r => /*#__PURE__*/React.createElement("option", {
    key: r,
    value: r
  }, r))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-green",
    style: {
      flex: 1
    },
    onClick: saveUser
  }, editId ? 'Save Changes' : 'Add User'), editId && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: resetForm
  }, "Cancel"))));
}

function App() {
  // ── PIN auth: current logged-in user + the editable users list. Users
  // persist independently of session data (dr_op_users) so they survive
  // "Start New Session" resets; the login itself persists too (dr_op_auth)
  // so staff aren't asked to re-enter their PIN on every page refresh.
  const [authUser, setAuthUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dr_op_auth')) || null;
    } catch {
      return null;
    }
  });
  const [users, setUsers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dr_op_users')) || [];
    } catch {
      return [];
    }
  });
  // Firestore is the source of truth for users; localStorage is just a
  // cache so login still works instantly (and offline) using last-synced
  // data. Retries waiting for window.fbUsers in case the Firebase module
  // script hasn't finished executing yet when this effect first runs.
  useEffect(() => {
    let unsub = null;
    let cancelled = false;
    const trySubscribe = () => {
      if (cancelled) return;
      if (!window.fbUsers) {
        setTimeout(trySubscribe, 100);
        return;
      }
      unsub = window.fbUsers.subscribe(list => {
        setUsers(list);
        try {
          localStorage.setItem('dr_op_users', JSON.stringify(list));
        } catch {}
      });
    };
    trySubscribe();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);
  const login = user => {
    setAuthUser(user);
    try {
      localStorage.setItem('dr_op_auth', JSON.stringify(user));
    } catch {}
  };
  const logout = () => {
    setAuthUser(null);
    try {
      localStorage.removeItem('dr_op_auth');
    } catch {}
  };
  // If Superadmin disables (or removes) the currently logged-in user while
  // the app is open, kick them out immediately rather than waiting for
  // their next action or page refresh.
  useEffect(() => {
    if (!authUser || authUser.role === 'Superadmin') return;
    const current = users.find(u => u.id === authUser.id);
    if (!current || current.enabled === false) {
      logout();
    }
  }, [users]);
  const [gameTime, setGameTime] = useState(() => loadLiveState()?.gameTime ?? 20);
  const [matchMode, setMatchMode] = useState(() => loadLiveState()?.matchMode ?? 'Same Level');
  // Remembers the last selected dropdown mode (Same Level / Skill Based / Open Level)
  // so toggling Manual off restores it instead of defaulting back to Same Level.
  const [lastDropdownMode, setLastDropdownMode] = useState(() => {
    const saved = loadLiveState()?.matchMode;
    return saved && saved !== 'Manual' ? saved : 'Same Level';
  });
  // Open Level: when on (default), the algorithm forces a mixed-doubles round
  // after 2 consecutive same-gender rounds. When off, it never forces mixed —
  // gender composition is left entirely to whatever combo scores best.
  const [forceMixedEnabled, setForceMixedEnabled] = useState(true);
  // When true, pairing/opponent freshness is checked BEFORE wait-time priority
  // in match selection (all modes). Default false preserves original behavior
  // where wait time is protected first and freshness only breaks ties.
  const [prioritizeFreshness, setPrioritizeFreshness] = useState(false);
  const [queue, setQueue] = useState(() => loadLiveState()?.queue ?? INIT_PLAYERS);
  const [courts, setCourts] = useState(() => {
    const saved = loadLiveState();
    return normalizeCourts(saved?.courts, saved?.numCourts ?? 3);
  });
  // Derived, not a separate state: the number of currently-enabled (on) courts.
  const numCourts = courts.filter(c => c.enabled).length;
  const [history, setHistory] = useState(() => loadLiveState()?.history ?? []);
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState('Open');
  const [newGender, setNewGender] = useState('M');
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerLevel, setNewPartnerLevel] = useState('Open');
  const [newPartnerGender, setNewPartnerGender] = useState('M');
  const [addingPair, setAddingPair] = useState(false);
  // OP Multi Group: named groups, each with its own assigned courts.
  // Players tagged to a group only play against others in that same group.
  const [playGroups, setPlayGroups] = useState(() => loadLiveState()?.playGroups ?? []); // [{ id, name, courtIds: [] }]
  const [newGroup, setNewGroup] = useState('');
  const [newPartnerGroup, setNewPartnerGroup] = useState('');
  // OP Meet: named teams. Partners must share a team; opponents must not.
  const [teams, setTeams] = useState(() => loadLiveState()?.teams ?? []); // [{ id, name }]
  const [newTeam, setNewTeam] = useState('');
  const [newPartnerTeam, setNewPartnerTeam] = useState('');
  const [scoreModal, setScoreModal] = useState(null);
  const [scoringEnabled, setScoringEnabled] = useState(false);
  const [winLoseEnabled, setWinLoseEnabled] = useState(false);
  const [winLoseWinner, setWinLoseWinner] = useState(null);
  const [lightMode, setLightMode] = useState(() => {
    try {
      return localStorage.getItem('dr_light_mode') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.body.classList.toggle('light-theme', lightMode);
    try {
      localStorage.setItem('dr_light_mode', lightMode ? '1' : '0');
    } catch {}
  }, [lightMode]);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [modalTeamA, setModalTeamA] = useState([]);
  const [modalTeamB, setModalTeamB] = useState([]);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('courts');
  const [manualSelected, setManualSelected] = useState([]);
  const [manualCourt, setManualCourt] = useState(null);
  const [waitlistSearch, setWaitlistSearch] = useState('');
  // OP Multi Group: which group's sub-tab is active in the Waitlist tab.
  // null = "All" (no filtering).
  const [waitlistGroupFilter, setWaitlistGroupFilter] = useState(null);
  // OP Meet: which team's sub-tab is active in the Waitlist tab. null = "All".
  const [waitlistTeamFilter, setWaitlistTeamFilter] = useState(null);
  const [playerListSearch, setPlayerListSearch] = useState('');
  const [playerList, setPlayerList] = useState(() => loadLiveState()?.playerList ?? INIT_PLAYERS.map(p => ({
    ...p
  })));
  const [manualSearch, setManualSearch] = useState('');
  const [reqSearch, setReqSearch] = useState('');
  const [pairSearch, setPairSearch] = useState('');
  const [rearrangeCourt, setRearrangeCourt] = useState(null); // courtId being rearranged
  const [dragPlayerId, setDragPlayerId] = useState(null); // id of player being dragged
  const [replacingPlayer, setReplacingPlayer] = useState(null); // { courtId, playerId } — sub-out mode
  const [crossCourtSwap, setCrossCourtSwap] = useState(null); // { courtId, playerId } — swap-across-courts mode: this is the first player picked, waiting for a target player on a different court
  const [simModal, setSimModal] = useState(false);
  const [simGames, setSimGames] = useState('96');
  const [simRunning, setSimRunning] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simTarget, setSimTarget] = useState(0);
  const notifTimer = useRef(null);
  const assignCount = useRef(0); // counts auto-assigns to schedule mixed doubles every 3rd game
  const sbMixedCount = useRef(0); // tracks Skill Based mixed-gender rotation
  const olSameGenderStreak = useRef(0); // Open Level: consecutive same-gender games streak

  // ── Sorting state for grid views ──────────────────────────────────────
  const [historySort, setHistorySort] = useState({
    col: null,
    dir: 'asc'
  });
  const [statsSort, setStatsSort] = useState({
    col: 'wins',
    dir: 'desc'
  });
  // Group/Team sub-tab filter for Player Stats (also scopes the Rank List
  // sent to the preview screen).
  const [statsGroupFilter, setStatsGroupFilter] = useState(null);
  const [statsTeamFilter, setStatsTeamFilter] = useState(null);
  const [queueSort, setQueueSort] = useState({
    col: null,
    dir: 'asc'
  });
  const toggleSort = (currentSort, setSort, col) => {
    setSort(prev => prev.col === col ? {
      col,
      dir: prev.dir === 'asc' ? 'desc' : 'asc'
    } : {
      col,
      dir: col === 'wins' || col === 'games' || col === 'winPct' || col === 'diff' ? 'desc' : 'asc'
    });
  };
  const SortIcon = ({
    sort,
    col
  }) => {
    if (sort.col !== col) return /*#__PURE__*/React.createElement("span", {
      style: {
        opacity: 0.25,
        marginLeft: 3,
        fontSize: 9
      }
    }, "⇅");
    return /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 3,
        fontSize: 9,
        color: 'var(--gold)'
      }
    }, sort.dir === 'asc' ? '▲' : '▼');
  };

  // ── Pairing history (partner + opponent repeat avoidance) ────────────
  // Two separate flat maps: "idA|idB" (sorted) → count. Kept as SEPARATE
  // maps rather than one shared map, because a pair can be partners in one
  // game and opponents in another — a single shared counter can't tell
  // those roles apart, which caused the partner-repeat badge to show a
  // count for pairs who had only ever been OPPONENTS, never partners.
  const partnerHistory = useRef({}); // { "id1|id2": count of times partnered }
  const opponentHistory = useRef({}); // { "id1|id2": count of times opposed }

  const phKey = (a, b) => [a, b].sort().join('|');
  const partnerGet = (a, b) => partnerHistory.current[phKey(a, b)] || 0;
  const opponentGet = (a, b) => opponentHistory.current[phKey(a, b)] || 0;

  // ── Group history (exact-foursome repeat avoidance) ───────────────────
  // Flat map: sorted 4-id key → number of times these exact 4 players have
  // shared a court together, REGARDLESS of how the teams were split.
  // Pairwise history above can't see "same 4, different split" as a
  // repeat — this closes that gap. Scored, not filtered, so a valid match
  // is still always returned even if it means reusing a group.
  const groupHistory = useRef({}); // { "id1|id2|id3|id4": count, ... }
  const ghKey = ids => [...ids].sort().join('|');
  const ghGet = ids => groupHistory.current[ghKey(ids)] || 0;

  const phRecord = (teamA, teamB) => {
    const bumpPartner = (a, b) => {
      const k = phKey(a, b);
      partnerHistory.current[k] = (partnerHistory.current[k] || 0) + 1;
    };
    const bumpOpponent = (a, b) => {
      const k = phKey(a, b);
      opponentHistory.current[k] = (opponentHistory.current[k] || 0) + 1;
    };
    // Partners
    if (teamA[0] && teamA[1]) bumpPartner(teamA[0].id, teamA[1].id);
    if (teamB[0] && teamB[1]) bumpPartner(teamB[0].id, teamB[1].id);
    // Opponents (all cross-team pairs)
    for (const pA of teamA) for (const pB of teamB) bumpOpponent(pA.id, pB.id);
    // Exact foursome, regardless of split
    const gk = ghKey([...teamA, ...teamB].map(p => p.id));
    groupHistory.current[gk] = (groupHistory.current[gk] || 0) + 1;
  };

  // (lastPlayedTime removed — time-based cooldowns must not affect matchmaking)
  // ── Games-played tracking (balances total game count across all players) ──
  const gamesPlayedRef = useRef({}); // { playerId: count }
  // ── Join-round tracking: fairness relative to when each player joined ──
  // joinRoundRef[playerId] = value of roundsFiredRef when they first joined the session.
  // This ensures late arrivals are compared fairly — a player who joined at round 6
  // is NOT penalized for having fewer games than someone who joined at round 0.
  const joinRoundRef = useRef({}); // { playerId: roundNumber }
  const roundsFiredRef = useRef(0); // total games fired since session start

  // On mount, if history was restored from the autosaved live state, rebuild
  // the pairing-history/games-played/join-round tracking refs from it so
  // matchmaking freshness scoring stays accurate after a page refresh.
  useEffect(() => {
    if (history && history.length) {
      partnerHistory.current = {};
      opponentHistory.current = {};
      groupHistory.current = {};
      gamesPlayedRef.current = {};
      joinRoundRef.current = {};
      roundsFiredRef.current = 0;
      history.forEach((g, idx) => {
        phRecord(g.teamA, g.teamB);
        [...g.teamA, ...g.teamB].forEach(p => {
          if (joinRoundRef.current[p.id] === undefined) joinRoundRef.current[p.id] = idx;
          gamesPlayedRef.current[p.id] = (gamesPlayedRef.current[p.id] || 0) + 1;
        });
        roundsFiredRef.current = idx + 1;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Score a candidate match: sum of all pairings among the 4 players.
  // Lower = fresher. Partner pairs weighted 2× to more strongly avoid
  // repeating the same partner vs the same opponent.
  // Also adds a heavy penalty for players who just finished a game (< cooldownMs ago).
  // scoreMatch: pure pairing-history freshness score.
  // Lower = fewer repeated partner/opponent combos = preferred match.
  // Scoring and time-based cooldowns are intentionally excluded —
  // the scoring feature is for recording only and must not affect matchmaking.
  // Freshness score for a candidate match.
  // Primary: max repeat count across ALL 6 pairs (partner + opponent).
  //   → A combo where ANY two players have met before scores worse than one where everyone is new.
  //   → Ensures fresh partner AND fresh opponents, not just shuffling one piece.
  // Secondary (tiebreak): total repeat count across all pairs.
  //   → Among combos with the same worst pair, prefer the one with fewer repeats overall.
  // Returns [maxRepeat, totalRepeats] — sort ascending on both.
  // A fixed partner pair (linked via partnerId) has no choice but to repeat
  // as partners every single game — that's not a matchmaking decision, so it
  // must not count against them in the freshness score. Without this, a fixed
  // pair's partner-repeat count goes to 1 after their very first game and
  // never returns to 0, and since maxRepeat dominates the score, any fully
  // fresh combo elsewhere in the queue will always outrank them — starving
  // fixed pairs of games after round one. Opponent freshness still counts
  // normally, so the algorithm still tries to give them new opponents.
  const isFixedPair = (p0, p1) => p0?.partnerId === p1?.id || p1?.partnerId === p0?.id;
  const scoreMatch = (teamA, teamB) => {
    const pairs = [...(isFixedPair(teamA[0], teamA[1]) ? [] : [partnerGet(teamA[0].id, teamA[1].id)]),
    // partner A (skipped if fixed)
    ...(isFixedPair(teamB[0], teamB[1]) ? [] : [partnerGet(teamB[0].id, teamB[1].id)]),
    // partner B (skipped if fixed)
    opponentGet(teamA[0].id, teamB[0].id),
    // opponents
    opponentGet(teamA[0].id, teamB[1].id), opponentGet(teamA[1].id, teamB[0].id), opponentGet(teamA[1].id, teamB[1].id)];
    const maxRepeat = pairs.length ? Math.max(...pairs) : 0;
    const totalRepeats = pairs.reduce((s, v) => s + v, 0);
    // Pack into a single comparable number: maxRepeat dominates, totalRepeats breaks ties
    return maxRepeat * 1000 + totalRepeats;
  };

  // ── Requested games queue ────────────────────────────────────────────
  const [requestedGames, setRequestedGames] = useState(() => loadLiveState()?.requestedGames ?? []); // [{ id, playerIds, addedAt }]

  // Autosave the live working state (players, waitlist, courts, history) so
  // a page refresh restores exactly where things were left off. This runs
  // independently of the explicit named "Save Session" feature.
  useEffect(() => {
    try {
      localStorage.setItem('dr_live_state', JSON.stringify({
        numCourts,
        gameTime,
        matchMode,
        queue,
        courts,
        history,
        playerList,
        requestedGames,
        playGroups,
        teams
      }));
    } catch {}
  }, [numCourts, gameTime, matchMode, queue, courts, history, playerList, requestedGames, playGroups, teams]);

  // ── Pair-link modal (set/remove fixed partner on existing players) ───
  const [pairModal, setPairModal] = useState(null); // null | { playerId }
  const [pairTarget, setPairTarget] = useState(null); // id of chosen partner
  const [reqSelected, setReqSelected] = useState([]); // players selected for a new requested game

  // ── Session management ──────────────────────────────────────────────
  const [sessionName, setSessionName] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dr_current_session_name')) || 'Session 1';
    } catch {
      return 'Session 1';
    }
  });
  const [sessionStarted, setSessionStarted] = useState(() => {
    try {
      return localStorage.getItem('dr_session_started') || new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  });
  const [sessionModal, setSessionModal] = useState(null); // null | 'save' | 'new' | 'load'
  const [savedSessions, setSavedSessions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dr_saved_sessions')) || [];
    } catch {
      return [];
    }
  });
  const [newSessionName, setNewSessionName] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const previewWinRef = useRef(null);
  const [autoPreview, setAutoPreview] = useState(false);
  const [autoAlert, setAutoAlert] = useState(false);
  const [showUpNext, setShowUpNext] = useState(false);
  const prevCourtsRef = useRef(courts);

  // Send alert overlay to the preview window instead of opening a separate popup.
  // If the preview window isn't open yet, open it first then send the alert once ready.
  const sendAlertToPreview = (courtId, teamA, teamB) => {
    const payload = {
      type: 'DR_ALERT',
      courtId,
      teamA,
      teamB
    };
    const sendTo = win => {
      try {
        win.postMessage(payload, '*');
      } catch (e) {}
    };
    if (previewWinRef.current && !previewWinRef.current.closed) {
      sendTo(previewWinRef.current);
    } else {
      // Open the preview window first, then send the alert after it's ready
      openPreviewWindow();
      const attempts = [600, 1200, 2000];
      attempts.forEach(ms => setTimeout(() => {
        if (previewWinRef.current && !previewWinRef.current.closed) sendTo(previewWinRef.current);
      }, ms));
    }
  };

  // Auto-open preview window when a court becomes active (game started), if autoPreview is on
  // Auto-open alert window when a court becomes active, if autoAlert is on
  useEffect(() => {
    const prevActive = prevCourtsRef.current.filter(c => c.players).length;
    const nowActive = courts.filter(c => c.players).length;
    if (nowActive > prevActive) {
      if (autoPreview) openPreviewWindow();
      if (autoAlert) {
        const newCourt = courts.find(c => c.players && !prevCourtsRef.current.find(pc => pc.id === c.id && pc.players));
        if (newCourt) sendAlertToPreview(newCourt.id, newCourt.players.teamA, newCourt.players.teamB);
      }
    }
    prevCourtsRef.current = courts;
  }, [courts, autoPreview, autoAlert]);

  // Listen for preview window signalling it's ready, then push current state
  useEffect(() => {
    const handler = e => {
      if (e.data && e.data.type === 'DR_PREVIEW_READY' && previewWinRef.current && !previewWinRef.current.closed) {
        try {
          previewWinRef.current.postMessage({
            type: 'DR_PREVIEW_UPDATE',
            courts: courts.filter(c => c.enabled),
            gameTime,
            sessionName,
            lightMode,
            upNext: computeUpNext()
          }, '*');
        } catch (err) {}
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [courts, gameTime, sessionName, showUpNext, lightMode]);

  // Push state to preview window whenever courts/gameTime/sessionName change
  useEffect(() => {
    if (previewWinRef.current && !previewWinRef.current.closed) {
      try {
        previewWinRef.current.postMessage({
          type: 'DR_PREVIEW_UPDATE',
          courts: courts.filter(c => c.enabled),
          gameTime,
          sessionName,
          lightMode,
          upNext: computeUpNext()
        }, '*');
      } catch (e) {}
    }
  }, [courts, gameTime, sessionName, showUpNext, lightMode]);

  // Compute upNext matches for the preview window — mirrors the Up Next preview logic
  const computeUpNext = () => {
    if (!showUpNext) return [];
    if (matchMode === 'Manual') return [];
    const upNextMatches = [];
    // Cap to first 20 players — avoids O(n⁴) hang with large rosters.
    let simQueue = queue.slice(0, 20);
    let simAssignCount = assignCount.current;
    let simSbMixedCount = sbMixedCount.current;
    let simOlStreak = olSameGenderStreak.current;
    for (let n = 0; n < 2; n++) {
      if (simQueue.length < 4) break;
      simAssignCount += 1;
      let forceMixed = false;
      if (matchMode === 'Same Level') forceMixed = simAssignCount % 3 === 0;
      if (matchMode === 'Open Level' || matchMode === 'OP Multi Group' || matchMode === 'OP Meet') forceMixed = forceMixedEnabled && simOlStreak >= 2;
      if (matchMode === 'Skill Based') {
        simSbMixedCount += 1;
        forceMixed = simSbMixedCount % 3 === 0;
      }
      let simPriorityIds = null;
      for (const req of requestedGames) {
        if (!req.readyToFire) continue;
        const positions = req.playerIds.map(id => simQueue.findIndex(p => p.id === id));
        if (positions.some(pos => pos === -1)) continue;
        const maxPos = Math.max(...positions);
        const othersAhead = simQueue.slice(0, maxPos).filter(p => !req.playerIds.includes(p.id)).length;
        if (othersAhead === 0) {
          simPriorityIds = req.playerIds;
          break;
        }
      }
      const m = findMatch(simQueue, matchMode, forceMixed, simPriorityIds);
      if (!m) break;
      upNextMatches.push(m);
      simQueue = simQueue.filter(p => !m.ids.includes(p.id));
    }
    return upNextMatches;
  };
  const openPreviewWindow = () => {
    if (previewWinRef.current && !previewWinRef.current.closed) {
      previewWinRef.current.focus();
      try {
        previewWinRef.current.postMessage({
          type: 'DR_PREVIEW_UPDATE',
          courts: courts.filter(c => c.enabled),
          gameTime,
          sessionName,
          lightMode,
          upNext: computeUpNext()
        }, '*');
      } catch (e) {}
      return;
    }
    const previewHTML = buildPreviewHTML();
    const blob = new Blob([previewHTML], {
      type: 'text/html'
    });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, 'DinkPreview', 'width=1200,height=750,resizable=yes,scrollbars=yes');
    previewWinRef.current = win;
    const courtsSnap = courts.filter(c => c.enabled),
      gtSnap = gameTime,
      snSnap = sessionName,
      lmSnap = lightMode;
    const sendInitial = () => {
      try {
        win.postMessage({
          type: 'DR_PREVIEW_UPDATE',
          courts: courtsSnap,
          gameTime: gtSnap,
          sessionName: snSnap,
          lightMode: lmSnap,
          upNext: computeUpNext()
        }, '*');
      } catch (e) {}
    };
    setTimeout(sendInitial, 400);
    setTimeout(sendInitial, 900);
    setTimeout(sendInitial, 1800);
    showNotif('Preview window opened!');
  };
  const buildPreviewHTML = () => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🏓 Court Display — DINK Republic</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --green: #00c853; --green-dim: #0d2a18;
    --gold: #ffd600; --gold-dim: #2a2200;
    --blue: #2196f3; --blue-dim: #0d2040;
    --red: #f44336;
    --orange: #ff9800;
    --purple: #ce93d8; --purple-dim: #1a0a2a;
    --surface: #0d1f3c; --surface2: #112240; --surface3: #172a4a;
    --border: #1e3a6a; --text-muted: #6a8cb4;
    --text-main: #e8f0fe;
  }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #060f20;
    color: var(--text-main);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 28px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  header h1 { font-size: 22px; font-weight: 900; color: var(--green); letter-spacing: 1px; text-transform: uppercase; }
  header .subtitle { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
  #clock { font-size: 20px; font-weight: 800; color: var(--gold); font-variant-numeric: tabular-nums; }
  #courts-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 18px;
    padding: 22px 24px;
    align-content: start;
  }
  .court-card {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 14px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: border-color 0.3s;
    min-height: 200px;
  }
  .court-card.active { border-color: var(--green); background: #0a2016; }
  .court-card.open { border-color: #1e3a6a; border-style: dashed; opacity: 0.55; }
  .court-card.up-next { border-color: #2a4070; border-style: dashed; opacity: 0.7; position: relative; overflow: hidden; }
  .court-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .court-num {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: var(--text-main);
  }
  .court-num span { font-size: 13px; font-weight: 600; color: var(--text-muted); margin-left: 4px; }
  .status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; vertical-align: middle; }
  .dot-green { background: var(--green); box-shadow: 0 0 8px var(--green); }
  .dot-gray { background: #2a4070; }
  .timer {
    font-size: 26px;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    letter-spacing: 1px;
  }
  .timer-ok { color: var(--green); }
  .timer-warn { color: var(--orange); }
  .timer-over { color: var(--red); animation: blink 1s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.35} }
  .teams { display: flex; flex-direction: column; gap: 6px; }
  .team-label {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 2px;
  }
  .team-a .team-label { color: var(--blue); }
  .team-b .team-label { color: var(--orange); }
  .player-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface2);
    border-radius: 8px;
    padding: 8px 12px;
  }
  .player-name-big { font-size: 18px; font-weight: 700; }
  .badge {
    display: inline-block; padding: 2px 7px; border-radius: 20px;
    font-size: 10px; font-weight: 800; flex-shrink: 0;
  }
  .badge-beg { background: #1a3a2a; color: #00c853; }
  .badge-li { background: #0d2040; color: #2196f3; }
  .badge-int { background: #0a2228; color: #00bcd4; }
  .badge-hi { background: #2a1800; color: #ff9800; }
  .badge-adv { background: #1a0a2a; color: #ce93d8; }
  .vs-divider {
    text-align: center; font-size: 11px; font-weight: 800;
    color: var(--text-muted); letter-spacing: 2px; padding: 2px 0;
  }
  .open-label {
    text-align: center; font-size: 15px; font-weight: 600;
    color: #2a4070; margin: auto 0;
  }
  footer {
    text-align: center;
    padding: 10px;
    font-size: 11px;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  /* ── Game-starting alert overlay (shown on this preview screen) ── */
  #alert-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(6, 15, 32, 0.92);
    z-index: 9999;
    align-items: center;
    justify-content: center;
    animation: fadeInBg 0.3s ease;
  }
  #alert-overlay.visible { display: flex; }
  @keyframes fadeInBg { from { opacity: 0; } to { opacity: 1; } }
  .alert-card {
    background: #0d1f3c;
    border: 2px solid #ffd600;
    border-radius: 20px;
    padding: 48px 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    max-width: 560px;
    width: 90%;
    box-shadow: 0 0 60px rgba(255,214,0,0.18), 0 8px 40px rgba(0,0,0,0.6);
    animation: popIn 0.35s cubic-bezier(0.175,0.885,0.32,1.275);
  }
  @keyframes popIn { from { opacity:0; transform: scale(0.88) translateY(24px); } to { opacity:1; transform: scale(1) translateY(0); } }
  .alert-ping { font-size: 72px; margin-bottom: 18px; animation: bounce 0.65s ease infinite alternate; }
  @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-12px); } }
  .alert-court-label {
    font-size: 26px; font-weight: 900; letter-spacing: 3px;
    text-transform: uppercase; color: #ffd600; margin-bottom: 6px;
  }
  .alert-subtitle {
    font-size: 13px; color: #4a6a94; margin-bottom: 34px;
    letter-spacing: 2px; text-transform: uppercase; font-weight: 700;
  }
  .alert-players { display: flex; flex-direction: column; gap: 12px; width: 100%; }
  .alert-player-row {
    background: #112240;
    border: 2px solid #1e3a6a;
    border-radius: 14px;
    padding: 18px 28px;
    text-align: center;
  }
  .alert-pname { font-size: 40px; font-weight: 900; letter-spacing: 0.5px; color: var(--text-main); }
  .alert-close-btn {
    margin-top: 32px;
    padding: 16px 56px;
    background: #ffd600;
    color: #000;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 900;
    cursor: pointer;
    letter-spacing: 1px;
    text-transform: uppercase;
    transition: background 0.15s, transform 0.1s;
  }
  .alert-close-btn:hover { background: #ffe033; transform: translateY(-2px); }
  .alert-close-btn:active { transform: translateY(0); }

  /* ── Top Performer + Rank List preview overlays ──────────────────── */
  .tp-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(6, 15, 32, 0.92);
    z-index: 9999;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeInBg 0.3s ease;
  }
  .tp-overlay.visible { display: flex; }
  .tp-card {
    position: relative;
    overflow: hidden;
    background: linear-gradient(160deg, #2a2200 0%, #1a1400 55%, #0d1f3c 100%);
    border: 2px solid var(--gold);
    border-radius: 22px;
    padding: 48px 44px 40px;
    text-align: center;
    max-width: 460px;
    width: 100%;
    box-shadow: 0 0 90px rgba(255,214,0,0.25), 0 8px 40px rgba(0,0,0,0.6);
    animation: tpPopIn 0.45s cubic-bezier(0.175,0.885,0.32,1.275);
  }
  @keyframes tpPopIn { from { opacity: 0; transform: scale(0.85) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .confetti-piece { position: absolute; top: -30px; font-size: 22px; opacity: 0.9; animation: confettiFall linear infinite; pointer-events: none; }
  @keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 8% { opacity: 1; } 100% { transform: translateY(520px) rotate(340deg); opacity: 0; } }
  .tp-kicker { font-size: 13px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: var(--gold); opacity: 0.85; margin-bottom: 8px; }
  .tp-trophy { font-size: 76px; line-height: 1; margin: 4px 0 12px; animation: tpTrophyBounce 1.1s ease-in-out infinite alternate; filter: drop-shadow(0 0 18px rgba(255,214,0,0.5)); }
  @keyframes tpTrophyBounce { from { transform: translateY(0) rotate(-3deg); } to { transform: translateY(-10px) rotate(3deg); } }
  .tp-name { font-size: 36px; font-weight: 900; color: #fff; margin-bottom: 4px; text-shadow: 0 2px 12px rgba(255,214,0,0.3); }
  .tp-sub { font-size: 14px; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 22px; }
  .tp-stats-row { display: flex; justify-content: center; gap: 30px; margin-top: 6px; padding-top: 20px; border-top: 1px solid rgba(255,214,0,0.25); }
  .tp-stat .val { font-size: 30px; font-weight: 900; color: #fff; line-height: 1; }
  .tp-stat.tp-wins .val { color: var(--gold); }
  .tp-stat .lbl { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; font-weight: 700; }
  .tp-close-btn { margin-top: 28px; padding: 14px 44px; background: var(--gold); color: #000; border: none; border-radius: 12px; font-size: 14px; font-weight: 900; cursor: pointer; letter-spacing: 1px; text-transform: uppercase; transition: transform 0.1s, background 0.15s; }
  .tp-close-btn:hover { background: #ffe033; transform: translateY(-2px); }
  .rank-list-modal { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 26px; width: 480px; max-width: 100%; max-height: 82vh; display: flex; flex-direction: column; box-shadow: 0 8px 50px rgba(0,0,0,0.5); }
  .rank-list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .rank-list-title { font-size: 21px; font-weight: 800; color: var(--text-main); }
  .rank-list-close-btn { background: transparent; border: 1px solid var(--border); color: var(--text-muted); border-radius: 8px; padding: 8px 18px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
  .rank-list-close-btn:hover { border-color: var(--blue); color: var(--blue); }
  .rank-list-body { overflow-y: auto; display: flex; flex-direction: column; gap: 5px; }
  .rank-row { display: flex; align-items: center; gap: 12px; padding: 11px 10px; border-radius: 8px; }
  .rank-row:nth-child(odd) { background: var(--surface2); }
  .rank-num { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; background: var(--surface3); color: var(--text-muted); flex-shrink: 0; }
  .rank-num.rank-1 { background: var(--gold); color: #000; }
  .rank-num.rank-2 { background: #c7cedb; color: #000; }
  .rank-num.rank-3 { background: #cd8a4a; color: #000; }
  .rank-name { flex: 1; font-weight: 700; font-size: 16px; color: var(--text-main); }
  .rank-wins { font-weight: 800; font-size: 15px; color: var(--green); white-space: nowrap; }

  /* ── Light mode theme override (synced from main app) ───────────── */
  body.light-theme {
    background: #f2f4f9;
    color: #1a2333;
    --green: #0a9a45; --green-dim: #d7f5e1;
    --gold: #b8860b; --gold-dim: #fbf0cf;
    --blue: #1565c0; --blue-dim: #dceafd;
    --red: #c62828;
    --orange: #d16b00;
    --purple: #7b1fa2; --purple-dim: #ecdcf5;
    --surface: #ffffff; --surface2: #f5f7fb; --surface3: #eaedf4;
    --border: #d7dce6; --text-muted: #5b6478;
    --text-main: #1a2333;
  }
  body.light-theme .court-card.active { background: #eaf9ef; }
  body.light-theme .court-card.open { border-color: #c7ceda; opacity: 0.7; }
  body.light-theme .court-card.up-next { border-color: #c7ceda; opacity: 0.85; }
  body.light-theme .dot-gray { background: #c7ceda; }
  body.light-theme .badge-beg { background: var(--green-dim); color: var(--green); }
  body.light-theme .badge-li { background: var(--blue-dim); color: var(--blue); }
  body.light-theme .badge-int { background: #d3f1f4; color: #00838f; }
  body.light-theme .badge-hi { background: var(--orange-dim); color: var(--orange); }
  body.light-theme .badge-adv { background: var(--purple-dim); color: var(--purple); }
  body.light-theme .open-label { color: #9aa4b8; }
  body.light-theme #alert-overlay { background: rgba(242, 244, 249, 0.92); }
  body.light-theme .alert-card { background: #ffffff; border-color: #b8860b; box-shadow: 0 0 60px rgba(184,134,11,0.18), 0 8px 40px rgba(0,0,0,0.15); }
  body.light-theme .alert-court-label { color: #b8860b; }
  body.light-theme .alert-subtitle { color: #5b6478; }
  body.light-theme .alert-player-row { background: #f5f7fb; border-color: #d7dce6; }
  body.light-theme .alert-close-btn { background: #b8860b; color: #fff; }
  body.light-theme .alert-close-btn:hover { background: #cf9915; }
</style>
</he${""}ad>
<bo${""}dy class="${lightMode ? 'light-theme' : ''}">
<header>
  <div>
    <h1>🏓 DINK Republic — Court Display</h1>
    <div class="subtitle" id="session-name">Live Court View</div>
  </div>
  <div id="clock">--:--:--</div>
</header>
<div id="courts-grid"></div>
<footer>Court Preview · Updates automatically from the main app</footer>

<!-- Game-starting alert overlay — triggered via postMessage from main app -->
<div id="alert-overlay">
  <div class="alert-card">
    <div class="alert-ping">🏓</div>
    <div class="alert-court-label" id="alert-court-label">Court —</div>
    <div class="alert-subtitle">Game Starting Now</div>
    <div class="alert-players" id="alert-players"></div>
    <button class="alert-close-btn" onclick="closeAlert()">Got it!</button>
  </div>
</div>

<!-- Top Performer celebratory overlay — triggered via postMessage from main app -->
<div id="topperf-overlay" class="tp-overlay">
  <div class="tp-card">
    <div class="tp-kicker">🏆 Top Performer</div>
    <div class="tp-trophy">🏆</div>
    <div class="tp-name" id="tp-name">—</div>
    <div class="tp-sub" id="tp-sub"></div>
    <div class="tp-stats-row">
      <div class="tp-stat tp-wins"><div class="val" id="tp-wins">0</div><div class="lbl">Wins</div></div>
      <div class="tp-stat"><div class="val" id="tp-games">0</div><div class="lbl">Games</div></div>
      <div class="tp-stat"><div class="val" id="tp-winrate">0%</div><div class="lbl">Win Rate</div></div>
    </div>
    <button class="tp-close-btn" onclick="closeTopPerformer()">Nice!</button>
  </div>
</div>

<!-- Top Team Performer celebratory overlay (OP Meet) — triggered via postMessage from main app -->
<div id="topperf-team-overlay" class="tp-overlay">
  <div class="tp-card">
    <div class="tp-kicker">🏆 Top Team Performer</div>
    <div class="tp-trophy">🏆</div>
    <div class="tp-name" id="tpteam-name">—</div>
    <div class="tp-sub" id="tpteam-sub"></div>
    <div class="tp-stats-row">
      <div class="tp-stat tp-wins"><div class="val" id="tpteam-wins">0</div><div class="lbl">Wins</div></div>
      <div class="tp-stat"><div class="val" id="tpteam-games">0</div><div class="lbl">Games</div></div>
      <div class="tp-stat"><div class="val" id="tpteam-winrate">0%</div><div class="lbl">Win Rate</div></div>
    </div>
    <button class="tp-close-btn" onclick="closeTopTeamPerformer()">Nice!</button>
  </div>
</div>

<!-- Rank List preview overlay — triggered via postMessage from main app -->
<div id="ranklist-overlay" class="tp-overlay">
  <div class="rank-list-modal">
    <div class="rank-list-header">
      <div class="rank-list-title" id="rank-list-title">📋 Rank List — Wins</div>
      <button class="rank-list-close-btn" onclick="closeRankList()">Close</button>
    </div>
    <div class="rank-list-body" id="rank-list-body"></div>
  </div>
</div>

<!-- Rank List Team preview overlay (OP Meet) — triggered via postMessage from main app -->
<div id="ranklist-team-overlay" class="tp-overlay">
  <div class="rank-list-modal">
    <div class="rank-list-header">
      <div class="rank-list-title">📋 Rank List — Team Wins</div>
      <button class="rank-list-close-btn" onclick="closeRankListTeam()">Close</button>
    </div>
    <div class="rank-list-body" id="rank-list-team-body"></div>
  </div>
</div>

\x3cscript>
const LEVEL_SHORT = { 'Beginner':'BEG','Low-Int':'L-INT','Intermediate':'INT','High-Int':'H-INT','Advanced':'ADV' };
const BADGE_CLASS = { 'Beginner':'badge-beg','Low-Int':'badge-li','Intermediate':'badge-int','High-Int':'badge-hi','Advanced':'badge-adv' };

let courtsData = [];
let gameTimeLimit = 20;
let upNextData = [];

function formatTimer(startTime, limitMin) {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const limit = limitMin * 60;
  const rem = limit - elapsed;
  const absRem = Math.abs(rem);
  const min = Math.floor(absRem / 60).toString().padStart(2,'0');
  const sec = (absRem % 60).toString().padStart(2,'0');
  const cls = rem < 0 ? 'timer-over' : rem < 120 ? 'timer-warn' : 'timer-ok';
  return { text: (rem < 0 ? '-' : '') + min + ':' + sec, cls };
}

function buildBadge(level) {
  return '<span class="badge ' + (BADGE_CLASS[level]||'badge-beg') + '">' + (LEVEL_SHORT[level]||level) + '</span>';
}

function buildPlayerRow(p) {
  return '<div class="player-row"><span class="player-name-big">' + p.name + '</span></div>';
}

function buildPlayerRowPreview(p) {
  const LEVEL_BADGE = { 'Beginner':'badge-beg','Low-Int':'badge-li','Intermediate':'badge-int','High-Int':'badge-hi','Advanced':'badge-adv' };
  const LEVEL_S = { 'Beginner':'BEG','Low-Int':'L-INT','Intermediate':'INT','High-Int':'H-INT','Advanced':'ADV' };
  const genderTag = p.gender === 'F'
    ? '<span style="font-size:11px;font-weight:800;color:#f06292;background:#2a0818;border:1px solid #e91e6344;border-radius:20px;padding:1px 6px;flex-shrink:0;">♀</span>'
    : '<span style="font-size:11px;font-weight:800;color:#64b5f6;background:#0d2040;border:1px solid #2196f344;border-radius:20px;padding:1px 6px;flex-shrink:0;">♂</span>';
  const lvlBadge = '<span class="badge ' + (LEVEL_BADGE[p.level]||'badge-beg') + '">' + (LEVEL_S[p.level]||p.level) + '</span>';
  return '<div class="player-row" style="opacity:0.9;">' + genderTag + lvlBadge + '<span class="player-name-big" style="font-size:16px;">' + p.name + '</span></div>';
}

function renderCourts() {
  const grid = document.getElementById('courts-grid');
  grid.innerHTML = '';

  // Active / open courts
  courtsData.forEach(court => {
    const card = document.createElement('div');
    card.className = 'court-card ' + (court.players ? 'active' : 'open');

    if (court.players) {
      const { text, cls } = formatTimer(court.startTime, gameTimeLimit);
      const teamAHTML = court.players.teamA.map(buildPlayerRow).join('');
      const teamBHTML = court.players.teamB.map(buildPlayerRow).join('');
      card.innerHTML =
        '<div class="court-header">' +
          '<div class="court-num"><span class="status-dot dot-green"></span>Court ' + court.id + '</div>' +
          '<div class="timer ' + cls + '">' + text + '</div>' +
        '</div>' +
        '<div class="teams">' +
          '<div class="team-a"><div class="team-label">Team A</div>' + teamAHTML + '</div>' +
          '<div class="vs-divider">— VS —</div>' +
          '<div class="team-b"><div class="team-label">Team B</div>' + teamBHTML + '</div>' +
        '</div>';
    } else {
      card.innerHTML =
        '<div class="court-header">' +
          '<div class="court-num"><span class="status-dot dot-gray"></span>Court ' + court.id + '</div>' +
          '<span style="font-size:11px;color:#2a4070;font-weight:700;letter-spacing:1px;">OPEN</span>' +
        '</div>' +
        '<div class="open-label">— Available —</div>';
    }
    grid.appendChild(card);
  });

  // Up Next cards
  upNextData.forEach((m, idx) => {
    if (!m || !m.teamA || !m.teamB) return;
    const fCount = [...m.teamA, ...m.teamB].filter(p => p.gender === 'F').length;
    const matchLabel = fCount === 2 ? '♀♂ Mixed Doubles' : fCount === 4 ? "♀ Women's Doubles" : "♂ Men's Doubles";
    const teamAHTML = m.teamA.map(buildPlayerRowPreview).join('');
    const teamBHTML = m.teamB.map(buildPlayerRowPreview).join('');
    const card = document.createElement('div');
    card.className = 'court-card up-next';
    card.innerHTML =
      '<div style="position:absolute;top:0;right:0;background:#1e3560;border-bottom-left-radius:6px;padding:2px 8px;font-size:9px;font-weight:800;color:#4a6a94;letter-spacing:1px;text-transform:uppercase;">Up Next ' + (idx + 1) + '</div>' +
      '<div class="court-header">' +
        '<div class="court-num" style="color:#4a6a94;"><span class="status-dot" style="background:#2a4070;"></span>Next Game ' + (idx + 1) + '</div>' +
        '<span style="font-size:9px;font-weight:800;color:#4a6a94;letter-spacing:.5px;text-transform:uppercase;">' + matchLabel + '</span>' +
      '</div>' +
      '<div class="teams">' +
        '<div class="team-a"><div class="team-label" style="color:#3a6a9a;">— TEAM A —</div>' + teamAHTML + '</div>' +
        '<div class="vs-divider" style="color:#2a4070;">— VS —</div>' +
        '<div class="team-b"><div class="team-label" style="color:#3a5a7a;">— TEAM B —</div>' + teamBHTML + '</div>' +
      '</div>' +
      '<div style="font-size:10px;color:#2a4070;text-align:center;margin-top:8px;font-style:italic;">preview · subject to change</div>';
    grid.appendChild(card);
  });
}

// Clock
setInterval(() => {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}, 1000);

// Re-render timers every second
setInterval(renderCourts, 1000);

// Listen for postMessage updates from opener — data comes as plain object now
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'DR_PREVIEW_UPDATE') {
    try {
      courtsData = e.data.courts || [];
      gameTimeLimit = e.data.gameTime || 20;
      upNextData = e.data.upNext || [];
      document.body.classList.toggle('light-theme', !!e.data.lightMode);
      const sn = document.getElementById('session-name');
      if (sn) sn.textContent = e.data.sessionName || 'Live Court View';
      renderCourts();
    } catch(err) {}
  }

  // ── Game-starting alert overlay ──────────────────────────────────
  if (e.data && e.data.type === 'DR_ALERT') {
    try {
      const { courtId, teamA, teamB } = e.data;
      const allPlayers = [...(teamA || []), ...(teamB || [])];
      document.getElementById('alert-court-label').textContent = 'Court ' + courtId;
      document.getElementById('alert-players').innerHTML = allPlayers
        .map(p => '<div class="alert-player-row"><span class="alert-pname">' + p.name + '</span></div>')
        .join('');
      const overlay = document.getElementById('alert-overlay');
      overlay.classList.add('visible');
      // Auto-dismiss after 12 seconds
      if (window._alertTimer) clearTimeout(window._alertTimer);
      window._alertTimer = setTimeout(() => overlay.classList.remove('visible'), 12000);
    } catch(err) {}
  }

  // ── Top Performer celebratory overlay ────────────────────────────
  if (e.data && e.data.type === 'DR_TOP_PERFORMER') {
    try {
      const tp = e.data.topPerformer;
      const card = document.querySelector('#topperf-overlay .tp-card');
      card.querySelectorAll('.confetti-piece').forEach(el => el.remove());
      const emojis = ['🎉','✨','🎊','🏓','⭐','🎉','✨','🏓'];
      emojis.forEach((em, i) => {
        const span = document.createElement('span');
        span.className = 'confetti-piece';
        span.textContent = em;
        span.style.left = (i * 12 % 100) + '%';
        span.style.animationDuration = (2.4 + i % 4 * 0.6) + 's';
        span.style.animationDelay = (i * 0.3) + 's';
        card.insertBefore(span, card.firstChild);
      });
      if (!tp) {
        document.getElementById('tp-name').textContent = 'No games yet';
        document.getElementById('tp-sub').textContent = 'Complete a game to crown a Top Performer';
        document.getElementById('tp-wins').textContent = '0';
        document.getElementById('tp-games').textContent = '0';
        document.getElementById('tp-winrate').textContent = '0%';
      } else {
        document.getElementById('tp-name').textContent = tp.name;
        document.getElementById('tp-sub').textContent = (tp.level || '') + ' · ' + (tp.gender === 'F' ? 'Women' : 'Men');
        document.getElementById('tp-wins').textContent = tp.wins;
        document.getElementById('tp-games').textContent = tp.games;
        document.getElementById('tp-winrate').textContent = tp.games ? Math.round(tp.wins / tp.games * 100) + '%' : '0%';
      }
      document.getElementById('topperf-overlay').classList.add('visible');
    } catch(err) {}
  }

  // ── Top Team Performer celebratory overlay (OP Meet) ───────────────
  if (e.data && e.data.type === 'DR_TOP_TEAM_PERFORMER') {
    try {
      const tp = e.data.topTeamPerformer;
      const card = document.querySelector('#topperf-team-overlay .tp-card');
      card.querySelectorAll('.confetti-piece').forEach(el => el.remove());
      const emojis = ['🎉','✨','🎊','🏓','⭐','🎉','✨','🏓'];
      emojis.forEach((em, i) => {
        const span = document.createElement('span');
        span.className = 'confetti-piece';
        span.textContent = em;
        span.style.left = (i * 12 % 100) + '%';
        span.style.animationDuration = (2.4 + i % 4 * 0.6) + 's';
        span.style.animationDelay = (i * 0.3) + 's';
        card.insertBefore(span, card.firstChild);
      });
      if (!tp) {
        document.getElementById('tpteam-name').textContent = 'No games yet';
        document.getElementById('tpteam-sub').textContent = 'Complete a game to crown a Top Team Performer';
        document.getElementById('tpteam-wins').textContent = '0';
        document.getElementById('tpteam-games').textContent = '0';
        document.getElementById('tpteam-winrate').textContent = '0%';
      } else {
        document.getElementById('tpteam-name').textContent = '🤝 ' + tp.name;
        document.getElementById('tpteam-sub').textContent = tp.playerCount + (tp.playerCount === 1 ? ' player' : ' players');
        document.getElementById('tpteam-wins').textContent = tp.wins;
        document.getElementById('tpteam-games').textContent = tp.games;
        document.getElementById('tpteam-winrate').textContent = tp.games ? Math.round(tp.wins / tp.games * 100) + '%' : '0%';
      }
      document.getElementById('topperf-team-overlay').classList.add('visible');
    } catch(err) {}
  }

  // ── Rank List preview overlay ────────────────────────────────────
  if (e.data && e.data.type === 'DR_RANK_LIST') {
    try {
      const players = e.data.rankedPlayers || [];
      const body = document.getElementById('rank-list-body');
      const titleEl = document.getElementById('rank-list-title');
      if (titleEl) titleEl.textContent = e.data.label ? ('📋 Rank List — Wins (' + e.data.label + ')') : '📋 Rank List — Wins';
      if (!players.length) {
        body.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:28px 0;">Complete games to build the rank list!</div>';
      } else {
        body.innerHTML = players.map((p, i) => {
          const cls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
          return '<div class="rank-row"><div class="rank-num ' + cls + '">' + (i + 1) + '</div><div class="rank-name">' + p.name + '</div><div class="rank-wins">' + p.wins + ' win' + (p.wins === 1 ? '' : 's') + '</div></div>';
        }).join('');
      }
      // e.data.show === false means this is a background refresh (e.g. a new
      // game just finished) rather than the user explicitly clicking "Send
      // Rank List". In that case only update the numbers already on screen —
      // don't pop the overlay open if the user had closed it.
      if (e.data.show !== false) {
        document.getElementById('ranklist-overlay').classList.add('visible');
      }
    } catch(err) {}
  }

  // ── Rank List Team preview overlay (OP Meet) ───────────────────────
  if (e.data && e.data.type === 'DR_RANK_LIST_TEAM') {
    try {
      const teamsList = e.data.rankedTeams || [];
      const body = document.getElementById('rank-list-team-body');
      if (!teamsList.length) {
        body.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:28px 0;">Complete games to build the team rank list!</div>';
      } else {
        body.innerHTML = teamsList.map((t, i) => {
          const cls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
          return '<div class="rank-row"><div class="rank-num ' + cls + '">' + (i + 1) + '</div><div class="rank-name">🤝 ' + t.name + '</div><div class="rank-wins">' + t.wins + ' win' + (t.wins === 1 ? '' : 's') + '</div></div>';
        }).join('');
      }
      if (e.data.show !== false) {
        document.getElementById('ranklist-team-overlay').classList.add('visible');
      }
    } catch(err) {}
  }
});

function closeAlert() {
  const overlay = document.getElementById('alert-overlay');
  if (overlay) overlay.classList.remove('visible');
  if (window._alertTimer) clearTimeout(window._alertTimer);
}

function closeTopPerformer() {
  const overlay = document.getElementById('topperf-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function closeTopTeamPerformer() {
  const overlay = document.getElementById('topperf-team-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function closeRankList() {
  const overlay = document.getElementById('ranklist-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function closeRankListTeam() {
  const overlay = document.getElementById('ranklist-team-overlay');
  if (overlay) overlay.classList.remove('visible');
}

// Esc closes whichever popup/overlay is currently open on the preview screen.
// Calling every close function is safe even if a given overlay isn't open —
// each one just removes a class that's already absent.
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape' && e.key !== 'Esc') return;
  closeAlert();
  closeTopPerformer();
  closeTopTeamPerformer();
  closeRankList();
  closeRankListTeam();
});

// Ask parent for data on load
window.addEventListener('load', () => {
  try { window.opener && window.opener.postMessage({ type: 'DR_PREVIEW_READY' }, '*'); } catch(e) {}
});

renderCourts();
<\/script>
</bo${""}dy>
</html>`;
  const buildSnapshot = () => ({
    name: sessionName,
    savedAt: new Date().toISOString(),
    startedAt: sessionStarted,
    numCourts,
    gameTime,
    matchMode,
    queue,
    history,
    playGroups,
    teams,
    courts: courts.map(c => ({
      ...c,
      startTime: c.startTime ? c.startTime : null
    }))
  });
  const saveSession = nameOverride => {
    const snap = {
      ...buildSnapshot(),
      name: nameOverride || sessionName
    };
    const updated = savedSessions.filter(s => s.name !== snap.name).concat(snap);
    setSavedSessions(updated);
    localStorage.setItem('dr_saved_sessions', JSON.stringify(updated));
    localStorage.setItem('dr_current_session_name', JSON.stringify(snap.name));
    localStorage.setItem('dr_session_started', sessionStarted);
    setLastSaved(new Date());
    showNotif(`Session "${snap.name}" saved!`);
    setSessionModal(null);
  };
  const loadSession = snap => {
    setSessionName(snap.name);
    setSessionStarted(snap.startedAt);
    setGameTime(snap.gameTime);
    setMatchMode(snap.matchMode);
    setQueue(snap.queue || []);
    setHistory(snap.history || []);
    setPlayGroups(snap.playGroups || []);
    setTeams(snap.teams || []);
    setCourts(normalizeCourts(snap.courts, snap.numCourts));
    // Rebuild pairing history from saved game history so repeat-avoidance is accurate
    partnerHistory.current = {};
    opponentHistory.current = {};
    groupHistory.current = {};
    gamesPlayedRef.current = {};
    joinRoundRef.current = {};
    roundsFiredRef.current = 0;
    olSameGenderStreak.current = 0;
    (snap.history || []).forEach((g, idx) => {
      phRecord(g.teamA, g.teamB);
      [...g.teamA, ...g.teamB].forEach(p => {
        if (joinRoundRef.current[p.id] === undefined) joinRoundRef.current[p.id] = idx;
        gamesPlayedRef.current[p.id] = (gamesPlayedRef.current[p.id] || 0) + 1;
      });
      roundsFiredRef.current = idx + 1;
    });
    localStorage.setItem('dr_current_session_name', JSON.stringify(snap.name));
    localStorage.setItem('dr_session_started', snap.startedAt);
    showNotif(`Loaded "${snap.name}"!`);
    setSessionModal(null);
    setActiveTab('courts');
  };
  const startNewSession = name => {
    const n = name.trim() || `Session ${savedSessions.length + 2}`;
    setSessionName(n);
    const now = new Date().toISOString();
    setSessionStarted(now);
    setQueue([]);
    setHistory([]);
    setPlayerList([]);
    setCourts(prev => prev.map(c => ({
      ...c,
      players: null,
      startTime: null
    })));
    setManualCourt(null);
    setManualSelected([]);
    setScoreModal(null);
    partnerHistory.current = {};
    opponentHistory.current = {};
    groupHistory.current = {};
    gamesPlayedRef.current = {};
    joinRoundRef.current = {};
    roundsFiredRef.current = 0;
    olSameGenderStreak.current = 0;
    localStorage.setItem('dr_current_session_name', JSON.stringify(n));
    localStorage.setItem('dr_session_started', now);
    setLastSaved(null);
    showNotif(`New session "${n}" started!`);
    setSessionModal(null);
    setActiveTab('courts');
  };
  const deleteSession = (name, e) => {
    e.stopPropagation();
    const updated = savedSessions.filter(s => s.name !== name);
    setSavedSessions(updated);
    localStorage.setItem('dr_saved_sessions', JSON.stringify(updated));
    showNotif(`Session "${name}" deleted`);
  };
  // ───────────────────────────────────────────────────────────────────

  const showNotif = msg => {
    setNotification(msg);
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => setNotification(null), 3000);
  };
  const toggleCourt = n => {
    const court = courts.find(c => c.id === n);
    if (!court) return;
    // Turning a court OFF while it has an ongoing game is blocked outright —
    // no override — to avoid losing live games.
    if (court.enabled && court.players) {
      showNotif(`Court ${n} has an ongoing game — end it before turning it off.`);
      return;
    }
    setCourts(prev => prev.map(c => c.id === n ? { ...c, enabled: !c.enabled } : c));
  };

  // Gender validation: if any female is present, exactly 2 females required (1 per team = mixed doubles).
  // Forbids 3M+1F, 4F alone vs 4M, or any combo where females are on same team.
  // In 'Open Level' mode this check is skipped — any gender combination is allowed.
  const genderValid = (tA, tB, mode) => {
    if (mode === 'Open Level' || mode === 'Manual' || mode === 'OP Multi Group' || mode === 'OP Meet') return true; // Open Level = all levels, no gender restriction
    const all = [...tA, ...tB];
    const femaleCount = all.filter(p => p.gender === 'F').length;
    if (femaleCount === 0 || femaleCount === 4) return true; // all-male or all-female: OK
    if (femaleCount !== 2) return false; // 1F or 3F: NOT OK
    // Exactly 2F: each team must have exactly 1F (mixed doubles)
    const femalesInA = tA.filter(p => p.gender === 'F').length;
    const femalesInB = tB.filter(p => p.gender === 'F').length;
    return femalesInA === 1 && femalesInB === 1;
  };
  const teamCompatible = (tA, tB, mode) => {
    if (!genderValid(tA, tB, mode)) return false;
    if (mode === 'Open Level' || mode === 'Manual' || mode === 'OP Multi Group' || mode === 'OP Meet') return true;
    const all = [...tA, ...tB];
    // 'Open' level players are wildcards — ignore them in span calc
    const levels = all.filter(p => p.level !== 'Open').map(p => LEVEL_IDX[p.level]);
    if (levels.length < 2) return true; // all Open level players, always compatible
    const minLvl = Math.min(...levels);
    const maxLvl = Math.max(...levels);
    const span = maxLvl - minLvl;
    if (mode === 'Same Level') return span === 0;
    if (mode === 'Skill Based') {
      // Valid adjacent pairs: ADV↔H-INT, H-INT↔INT, INT↔L-INT, L-INT↔BEG
      // BEG(0) and ADV(4) cannot be in the same game (span > 1)
      return span <= 1;
    }
    return true;
  };

  // Returns true if a 4-player group respects fixed-partner constraints.
  // Mixed mode: partners ARE respected — doubles pairs stay together on the same team.
  const partnersRespected = (tA, tB, mode) => {
    const allFour = [...tA, ...tB];
    for (const p of allFour) {
      if (!p.partnerId) continue;
      const partnerInGroup = allFour.find(x => x.id === p.partnerId);
      if (!partnerInGroup) return false; // partner not in this match
      // They must be on the SAME team
      const pInA = tA.find(x => x.id === p.id);
      const partnerInA = tA.find(x => x.id === p.partnerId);
      if (!!pInA !== !!partnerInA) return false; // one in A, one in B
    }
    return true;
  };

  // Fisher-Yates shuffle
  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Given 4 players sorted by level (ascending), return balanced team split:
  // strongest (idx 3) pairs with weakest (idx 0) → Team A
  // two middles (idx 1 & 2) → Team B
  // This ensures each team has a balanced skill spread rather than stacking.
  // If players have fixed partner links, respect those over the balance rule.
  const balancedTeams = four => {
    // Check if any fixed partner pairs exist within these four
    const pairIds = new Set(four.filter(p => p.partnerId).map(p => p.partnerId));
    const hasPairs = four.some(p => p.partnerId && pairIds.has(p.id));
    if (hasPairs) {
      // Respect fixed pairs: find the two partner pairs and put each on a team
      const used = new Set();
      const teams = [[], []];
      for (const p of four) {
        if (used.has(p.id)) continue;
        const partner = four.find(x => x.id === p.partnerId && !used.has(x.id));
        if (partner) {
          const slot = teams[0].length <= teams[1].length ? 0 : 1;
          teams[slot].push(p, partner);
          used.add(p.id);
          used.add(partner.id);
        }
      }
      // Any unpaired players fill remaining slots
      for (const p of four) {
        if (!used.has(p.id)) {
          const slot = teams[0].length < 2 ? 0 : 1;
          teams[slot].push(p);
          used.add(p.id);
        }
      }
      if (teams[0].length === 2 && teams[1].length === 2) {
        return {
          teamA: teams[0],
          teamB: teams[1]
        };
      }
    }

    // Balanced split: sort by level, pair highest+lowest vs two middles
    const byLevel = [...four].sort((a, b) => LEVEL_IDX[a.level] - LEVEL_IDX[b.level]);
    // byLevel[0]=weakest, [1]=low-mid, [2]=high-mid, [3]=strongest
    // Team A: strongest + weakest  |  Team B: two middles
    return {
      teamA: [byLevel[3], byLevel[0]],
      teamB: [byLevel[2], byLevel[1]]
    };
  };

  // ── Skill Based matchmaking helpers ──────────────────────────────────
  // Try all 3 unique splits of 4 players.
  // wantMixed=true  → only accept splits with exactly 1F per team (mixed doubles)
  // wantMixed=false → only accept splits that are all-M or all-F (same gender)
  // wantMixed=null  → accept any valid split
  const sbTrySplit = (players, wantMixed) => {
    const splits = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
    for (const [a, b, c, d] of splits) {
      const tA = [players[a], players[b]],
        tB = [players[c], players[d]];
      const fA = tA.filter(p => p.gender === 'F').length;
      const fB = tB.filter(p => p.gender === 'F').length;
      const total = fA + fB;
      const isMixed = total === 2 && fA === 1 && fB === 1;
      const isSameGender = total === 0 || total === 4;
      if (wantMixed === true && !isMixed) continue;
      if (wantMixed === false && !isSameGender) continue;
      // wantMixed===null means any valid pairing
      if (!isMixed && !isSameGender) continue; // always reject 1F or 3F total
      if (!partnersRespected(tA, tB, 'Skill Based')) continue;
      return {
        teamA: tA,
        teamB: tB,
        ids: players.map(p => p.id)
      };
    }
    return null;
  };
  const findMatch = (q, mode, forceMixed = false, priorityIds = null) => {
    if (mode === 'Manual') return null;

    // Queue is already in registration/wait order — preserve it.
    // If priorityIds provided (requested game), use exactly those 4 players.
    let sorted = [...q];
    if (priorityIds && priorityIds.length === 4) {
      const pinned = priorityIds.map(id => q.find(p => p.id === id)).filter(Boolean);
      if (pinned.length === 4) sorted = pinned;
    }

    // Queue position map: lower index = waited longer. Shared across all
    // modes so Same Level and Skill Based can also prioritize combos where
    // everyone has waited a while, not just Open Level (which already did).
    const qpos = {};
    sorted.forEach((p, i) => {
      qpos[p.id] = i;
    });
    const worstQposIds = ids => Math.max(...ids.map(id => qpos[id] ?? 999));

    // ── Freshness scoring ─────────────────────────────────────────────
    // Collect ALL valid candidates then pick the one with the lowest
    // repeat-pairing score. This mirrors PickleMixer's core logic:
    // track every prior pairing and prefer combos that haven't been seen.
    //
    // To preserve queue-order fairness we only search combos that include
    // the first available player (sorted[0]), so no one waits forever.
    // For priorityIds we search all combos among those 4 only.
    //
    // Wait time is checked BEFORE freshness: among all valid candidates,
    // prefer the group where the most-recently-joined member has still
    // waited the longest (lowest worst-queue-position), and only use
    // pairing freshness to break ties within that. Without this, freshness
    // alone can quietly keep passing over the same players once the group
    // is small enough that most repeat scores look similar.
    //
    // Group repeat (exact same 4 people, any split) is checked FIRST, ahead
    // of both wait and freshness — pairwise freshness alone can't tell "same
    // 4 people, reshuffled teams" apart from a genuinely new group, so this
    // closes that gap before the existing wait/fresh comparison ever runs.
    const pickBest = candidates => {
      if (!candidates.length) return null;
      let best = candidates[0];
      let bestGroupRepeat = ghGet(best.ids);
      let bestWait = worstQposIds(best.ids);
      let bestScore = scoreMatch(best.teamA, best.teamB);
      for (let ci = 1; ci < candidates.length; ci++) {
        const c = candidates[ci];
        const groupRepeat = ghGet(c.ids);
        const wait = worstQposIds(c.ids);
        const s = scoreMatch(c.teamA, c.teamB);
        // When prioritizeFreshness is on, freshness (s) is compared first and
        // wait position only breaks ties. Otherwise wait position is checked
        // first as originally designed. Group repeat overrides both.
        const better = groupRepeat < bestGroupRepeat || groupRepeat === bestGroupRepeat && (prioritizeFreshness ? s < bestScore || s === bestScore && wait < bestWait : wait < bestWait || wait === bestWait && s < bestScore);
        if (better) {
          best = c;
          bestGroupRepeat = groupRepeat;
          bestWait = wait;
          bestScore = s;
        }
      }
      return best;
    };

    // ── OPEN LEVEL MODE ───────────────────────────────────────────────
    // Search the full queue (capped at 20 for performance).
    // Scoring per combo:
    //   1. Gender balance: only fc===2 (exactly 2 females in the group) is
    //      gated on achieving a properly mixed split. Odd counts (1F or 3F)
    //      can't be split more fairly regardless of arrangement, so they're
    //      never penalized — otherwise a lone minority-gender player gets
    //      starved indefinitely whenever the rest of the pool can keep
    //      forming all-one-gender groups instead.
    //   2. Level balance (minimize average level diff between teams)
    //   3. Group repeat: has this EXACT foursome played together before,
    //      regardless of how the teams were split? Pairwise freshness (step 5)
    //      can't see this pattern on its own — a group can look "fresh" per-pair
    //      while still being the same 4 people re-matched with a shuffled split.
    //   4. Wait priority: worst queue position in the group — players who have
    //      waited longer push their combo up. This prevents anyone getting stuck.
    //   5. Pairing + opponent freshness (new faces preferred)
    if (mode === 'Open Level' || mode === 'OP Multi Group' || mode === 'OP Meet') {
      const pool = sorted.slice(0, 20);
      const splits = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];

      const levelBalance = (tA, tB) => {
        const lvl = p => LEVEL_IDX[p.level] ?? 1;
        const avgA = tA.reduce((s, p) => s + lvl(p), 0) / tA.length;
        const avgB = tB.reduce((s, p) => s + lvl(p), 0) / tB.length;
        return Math.abs(avgA - avgB);
      };

      // Worst (highest) queue position in the group — lower is better.
      // This penalises combos that include someone who just joined or returned,
      // naturally surfacing groups where everyone has waited a long time.
      const worstQpos = players => worstQposIds(players.map(p => p.id));
      const bestSplitForCombo = players => {
        // OP Multi Group: all 4 players must be tagged to the SAME group.
        // Players without a group assigned can't be matched in this mode.
        if (mode === 'OP Multi Group') {
          const groupIds = players.map(p => p.group || null);
          if (groupIds.some(s => !s) || new Set(groupIds).size !== 1) return null;
        }
        const fc = players.filter(p => p.gender === 'F').length;
        const candidates = [];
        for (const [a, b, c, d] of splits) {
          const tA = [players[a], players[b]],
            tB = [players[c], players[d]];
          if (!partnersRespected(tA, tB, mode)) continue;
          // OP Meet: partners (teammates) must share the same team tag, and
          // the two teams facing off must NOT share a team tag. Players
          // without a team assigned can't be matched in this mode.
          if (mode === 'OP Meet') {
            const teamOf = p => p.team || null;
            const tAt = [teamOf(tA[0]), teamOf(tA[1])];
            const tBt = [teamOf(tB[0]), teamOf(tB[1])];
            if (!tAt[0] || !tAt[1] || !tBt[0] || !tBt[1]) continue;
            if (tAt[0] !== tAt[1] || tBt[0] !== tBt[1]) continue;
            if (tAt[0] === tBt[0]) continue;
          }
          const fA = tA.filter(p => p.gender === 'F').length;
          const isMixed = fc === 2 && fA === 1;
          // genderOk only needs to gate fc === 2 (the only female-count where a
          // BETTER split is actually achievable — 1F+1F on the same team vs.
          // properly mixed 1F per team). For fc === 1 or fc === 3, there is no
          // fairer arrangement possible no matter how the teams are split, so
          // treating those as "not OK" (as fc === 0/4 always were) permanently
          // starves any lone minority-gender player whenever enough same-gender
          // players exist elsewhere to keep forming fc === 0/4 combos instead.
          const genderOk = fc === 2 ? isMixed : true;
          const wantedGender = forceMixed ? isMixed ? 0 : 1 : isMixed ? 1 : 0;
          const type = isMixed ? 'mixed' : fc === 4 ? 'womens' : fc === 0 ? 'mens' : 'uneven';
          candidates.push({
            teamA: tA,
            teamB: tB,
            ids: players.map(p => p.id),
            type,
            genderOk,
            wantedGender,
            levelBal: levelBalance(tA, tB),
            groupRepeat: ghGet(players.map(p => p.id)),
            waitScore: worstQpos(players),
            fresh: scoreMatch(tA, tB)
          });
        }
        if (!candidates.length) return null;
        candidates.sort((x, y) => y.genderOk - x.genderOk || x.wantedGender - y.wantedGender || x.levelBal - y.levelBal || x.groupRepeat - y.groupRepeat || (prioritizeFreshness ? (x.fresh - y.fresh) || (x.waitScore - y.waitScore) : (x.waitScore - y.waitScore) || (x.fresh - y.fresh)));
        return candidates[0];
      };
      const combos = [];
      for (let i = 0; i < pool.length - 3; i++) for (let j = i + 1; j < pool.length - 2; j++) for (let k = j + 1; k < pool.length - 1; k++) for (let l = k + 1; l < pool.length; l++) {
        const c = bestSplitForCombo([pool[i], pool[j], pool[k], pool[l]]);
        if (c) combos.push(c);
      }
      if (!combos.length) return null;
      combos.sort((x, y) => y.genderOk - x.genderOk || x.wantedGender - y.wantedGender || x.levelBal - y.levelBal || x.groupRepeat - y.groupRepeat || (prioritizeFreshness ? (x.fresh - y.fresh) || (x.waitScore - y.waitScore) : (x.waitScore - y.waitScore) || (x.fresh - y.fresh)));
      return combos[0];
    }

    // ── SAME LEVEL MODE ───────────────────────────────────────────────
    if (mode === 'Same Level') {
      const tryCombo = (players, isSameGenderOnly) => {
        const femaleCount = players.filter(p => p.gender === 'F').length;
        if (isSameGenderOnly && femaleCount !== 0 && femaleCount !== 4) return null;
        const splits = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
        let best = null,
          bestScore = Infinity;
        for (const [a, b, c, d] of splits) {
          const tA = [players[a], players[b]],
            tB = [players[c], players[d]];
          if (teamCompatible(tA, tB, mode) && partnersRespected(tA, tB, mode)) {
            const s = scoreMatch(tA, tB);
            if (s < bestScore) {
              best = {
                teamA: tA,
                teamB: tB,
                ids: players.map(p => p.id)
              };
              bestScore = s;
            }
          }
        }
        return best;
      };

      // Collect all valid 4-player groups anchored to sorted[0]
      const collectSameLevel = (isSameGenderOnly, requireMixed) => {
        const candidates = [];
        for (let i = 0; i < (priorityIds ? 1 : sorted.length - 3); i++) for (let j = i + 1; j < sorted.length - 2; j++) for (let k = j + 1; k < sorted.length - 1; k++) for (let l = k + 1; l < sorted.length; l++) {
          const players = [sorted[i], sorted[j], sorted[k], sorted[l]];
          if (requireMixed && players.filter(p => p.gender === 'F').length !== 2) continue;
          const r = tryCombo(players, isSameGenderOnly);
          if (r) candidates.push(r);
        }
        return candidates;
      };
      if (!forceMixed) {
        const c = collectSameLevel(true, false);
        if (c.length) return pickBest(c);
      }
      const c2 = collectSameLevel(false, forceMixed);
      if (c2.length) return pickBest(c2);
      if (forceMixed) {
        const c3 = collectSameLevel(false, false);
        if (c3.length) return pickBest(c3);
      }
      return null;
    }

    // ── SKILL BASED MODE ─────────────────────────────────────────────
    // Priority stack:
    //   1. Level span ≤ 1 (adjacent levels only; widens to ≤2 then any as fallback)
    //   2. Join-adjusted deficit (same fairness metric as Open Level — who is most owed)
    //   3. Max individual games (prevent any one player pulling far ahead)
    //   4. Queue anchor — prefer combos that include the longest-waiting player
    //      (soft, only breaks ties after fairness is satisfied)
    //   5. Gender rotation (wantMixed preference, falls back gracefully)
    //   6. Group repeat — same exact foursome before, any split? (via pickBest)
    //   7. Pairing freshness (final tiebreaker, via pickBest)
    if (mode === 'Skill Based') {
      const activeCount = Math.max(4, sorted.length);
      const expectedRate = Math.min(1.0, 4 / activeCount);
      const getDeficit = p => {
        const joinRound = joinRoundRef.current[p.id] ?? 0;
        const roundsAvailable = Math.max(0, roundsFiredRef.current - joinRound);
        return roundsAvailable * expectedRate - (gamesPlayedRef.current[p.id] || 0);
      };
      const groupDeficit = c => [...c.teamA, ...c.teamB].reduce((sum, p) => sum + getDeficit(p), 0);
      const maxIndividualGames = c => Math.max(...[...c.teamA, ...c.teamB].map(p => gamesPlayedRef.current[p.id] || 0));

      // Collect all valid combos at a given level span and gender preference.
      // wantMixed=true → mixed doubles only
      // wantMixed=false → same-gender only
      // wantMixed=null → either
      const collectSB = (maxSpan, wantMixed) => {
        const candidates = [];
        for (let i = 0; i < sorted.length - 3; i++) for (let j = i + 1; j < sorted.length - 2; j++) for (let k = j + 1; k < sorted.length - 1; k++) for (let l = k + 1; l < sorted.length; l++) {
          const players = [sorted[i], sorted[j], sorted[k], sorted[l]];
          const idxs = players.map(p => LEVEL_IDX[p.level] < 0 ? 0 : LEVEL_IDX[p.level]);
          if (Math.max(...idxs) - Math.min(...idxs) > maxSpan) continue;
          const result = sbTrySplit(players, wantMixed);
          if (result) candidates.push(result);
        }
        return candidates;
      };

      // Apply fairness filtering then pick best from a candidate pool.
      // Returns null if pool is empty.
      const pickFair = candidates => {
        if (!candidates.length) return null;
        const TOLERANCE = 0.05;

        // Step 1: maximize group deficit (most owed a game, join-adjusted)
        const maxDef = Math.max(...candidates.map(groupDeficit));
        const fairPool = candidates.filter(c => groupDeficit(c) >= maxDef - TOLERANCE);

        // Step 2: minimize max individual games
        const minMax = Math.min(...fairPool.map(maxIndividualGames));
        const balancedPool = fairPool.filter(c => maxIndividualGames(c) === minMax);

        // Step 3: soft anchor — prefer combos containing sorted[0] (longest-waiting)
        const withAnchor = balancedPool.filter(c => [...c.teamA, ...c.teamB].some(p => p.id === sorted[0].id));
        const anchorPool = withAnchor.length ? withAnchor : balancedPool;

        // Step 4: pairing freshness tiebreaker
        return pickBest(anchorPool);
      };

      // Pass 1: span ≤ 1, desired gender
      let result = pickFair(collectSB(1, forceMixed));
      if (result) return result;

      // Pass 2: span ≤ 1, opposite gender
      result = pickFair(collectSB(1, !forceMixed));
      if (result) return result;

      // Pass 3: span ≤ 2, desired gender first, then opposite
      result = pickFair(collectSB(2, forceMixed));
      if (result) return result;
      result = pickFair(collectSB(2, !forceMixed));
      if (result) return result;

      // Pass 4: any span, any gender
      return pickFair(collectSB(99, null));
    }
    return null;
  };

  // ── Requested Games helpers ───────────────────────────────────────────
  const addRequestedGame = playerIds => {
    if (playerIds.length !== 4) return;
    // Snapshot every OTHER player in the session right now (queue + on-court).
    // The requested game only auto-fires after ALL of these players have had
    // at least one game since this request was added — i.e. they've had their turn.
    const allSessionIds = [...queue.map(p => p.id), ...courts.flatMap(c => c.players ? [...c.players.teamA, ...c.players.teamB].map(p => p.id) : [])];
    const otherPlayerIds = allSessionIds.filter(id => !playerIds.includes(id));
    // For each other player, record their current game count as baseline.
    // They've "had their turn" once their count exceeds this baseline.
    // NOTE: Recompute stats fresh from history here — the render-time `playerStats`
    // may be stale if called right after a score submission (state not yet flushed).
    const freshStats = {};
    history.forEach(g => {
      [...g.teamA, ...g.teamB].forEach(p => {
        if (!freshStats[p.id]) freshStats[p.id] = {
          games: 0
        };
        freshStats[p.id].games++;
      });
    });
    const otherBaselines = {};
    otherPlayerIds.forEach(id => {
      otherBaselines[id] = freshStats[id]?.games || 0;
    });
    setRequestedGames(prev => [...prev, {
      id: Date.now(),
      playerIds,
      addedAt: Date.now(),
      otherBaselines // { playerId: gamesAtRequestTime }
    }]);
    showNotif(`Requested game added! Fires after all ${otherPlayerIds.length} other players have had their turn.`);
  };
  const removeRequestedGame = id => {
    setRequestedGames(prev => prev.filter(r => r.id !== id));
  };

  // ── Pair-link helpers (set/remove fixed partner on existing players) ──
  const linkPartners = (idA, idB) => {
    const pA = queue.find(p => p.id === idA);
    const pB = queue.find(p => p.id === idB);
    setQueue(prev => prev.map(p => {
      if (p.id === idA) return {
        ...p,
        partnerId: idB
      };
      if (p.id === idB) return {
        ...p,
        partnerId: idA
      };
      return p;
    }));
    if (pA && pB && pA.level !== pB.level && pA.level !== 'Open' && pB.level !== 'Open') {
      showNotif(`Fixed pair linked! Heads up: ${pA.level} + ${pB.level} won't be matched in Same Level mode until levels match.`);
    } else {
      showNotif('Fixed pair linked!');
    }
  };
  const unlinkPartner = id => {
    setQueue(prev => {
      const target = prev.find(p => p.id === id);
      const partnerId = target?.partnerId;
      return prev.map(p => {
        if (p.id === id || p.id === partnerId) return {
          ...p,
          partnerId: null
        };
        return p;
      });
    });
    showNotif('Fixed pair removed.');
  };
  const autoAssign = targetCourtId => {
    if (matchMode === 'Manual') {
      showNotif('Switch to Auto mode or use Assign Manually on a court');
      return;
    }
    // OP Multi Group: courts are tied to groups, so find a group that
    // has both an open assigned court AND enough waiting players before
    // picking a court — unlike other modes, courts aren't interchangeable.
    let open = null;
    let groupCtx = null;
    let assignQueue = queue;
    if (matchMode === 'OP Multi Group') {
      for (const s of playGroups) {
        const courtIds = s.courtIds || [];
        if (!courtIds.length) continue;
        const candidateCourt = targetCourtId ? courtIds.includes(targetCourtId) ? courts.find(c => c.id === targetCourtId && c.enabled && !c.players) : null : courts.find(c => courtIds.includes(c.id) && c.enabled && !c.players);
        if (!candidateCourt) continue;
        const groupQueue = queue.filter(p => p.group === s.id);
        if (groupQueue.length < 4) continue;
        open = candidateCourt;
        groupCtx = s;
        assignQueue = groupQueue;
        break;
      }
      if (!open) {
        showNotif('No open group court with 4+ waiting players in that group');
        return;
      }
    } else {
      open = targetCourtId ? courts.find(c => c.id === targetCourtId && c.enabled && !c.players) : courts.find(c => c.enabled && !c.players);
      if (!open) {
        showNotif('No open courts available');
        return;
      }
      if (queue.length < 4) {
        showNotif('Need at least 4 players in queue');
        return;
      }
    }
    assignCount.current += 1;
    let forceMixed = false;
    if (matchMode === 'Same Level') {
      forceMixed = assignCount.current % 3 === 0;
    }
    if (matchMode === 'Open Level' || matchMode === 'OP Multi Group' || matchMode === 'OP Meet') {
      forceMixed = forceMixedEnabled && olSameGenderStreak.current >= 2;
    }
    if (matchMode === 'Skill Based') {
      sbMixedCount.current += 1;
      forceMixed = sbMixedCount.current % 3 === 0;
    }

    // Check if any readyToFire requested game has all 4 players already
    // at the very front of the queue (no one waiting ahead of them is being
    // skipped). We define "at the front" as: every one of the 4 players
    // appears within the first (queuePosition + 3) slots — meaning no other
    // players are ahead of the last of the 4. This prevents skipping players
    // who registered or returned earlier.
    let priorityIds = null;
    let firedReqId = null;
    for (const req of requestedGames) {
      if (!req.readyToFire) continue;
      if (groupCtx && !req.playerIds.every(id => assignQueue.some(p => p.id === id))) continue;
      const positions = req.playerIds.map(id => queue.findIndex(p => p.id === id));
      if (positions.some(pos => pos === -1)) continue; // some not in queue yet
      const maxPos = Math.max(...positions);
      // Count how many queue members are NOT part of this requested game
      // and sit BEFORE the last of the 4 players.
      const othersAhead = queue.slice(0, maxPos).filter(p => !req.playerIds.includes(p.id)).length;
      if (othersAhead === 0) {
        // All 4 are at the front — no one is being skipped
        priorityIds = req.playerIds;
        firedReqId = req.id;
        break;
      }
    }
    const match = findMatch(assignQueue, matchMode, forceMixed, priorityIds);
    if (!match) {
      showNotif(`No valid match found for "${matchMode}" mode`);
      return;
    }
    const {
      teamA,
      teamB,
      ids
    } = match;
    setCourts(prev => prev.map(c => c.id === open.id ? {
      ...c,
      players: {
        teamA,
        teamB
      },
      startTime: Date.now()
    } : c));
    setQueue(prev => prev.filter(p => !ids.includes(p.id)));
    if (firedReqId) setRequestedGames(prev => prev.filter(r => r.id !== firedReqId));
    roundsFiredRef.current += 1;
    const fCount = [...teamA, ...teamB].filter(p => p.gender === 'F').length;
    const matchType = matchMode === 'Open Level' ? 'Open Levels' : matchMode === 'OP Multi Group' ? 'Multi Group' : matchMode === 'OP Meet' ? 'Team Meet' : fCount === 2 ? 'Mixed Doubles' : fCount === 4 ? "Women's Doubles" : "Men's Doubles";
    const reqLabel = firedReqId ? '🎯 Requested ' : '';
    showNotif(`Court ${open.id} — ${reqLabel}${matchType} started!`);
  };

  // ── Start a specific requested game on an open court ─────────────────
  // This is SEPARATE from Auto Assign. It pulls the 4 players from wherever
  // they are (queue or just returned from court) and fills an open court.
  // It does NOT touch the rest of the queue order at all.
  const startRequestedGame = req => {
    const open = courts.find(c => c.enabled && !c.players);
    if (!open) {
      showNotif('No open courts — end a game first');
      return;
    }
    // Collect the 4 players from the queue
    const players = req.playerIds.map(id => queue.find(p => p.id === id)).filter(Boolean);
    if (players.length !== 4) {
      showNotif('Not all 4 players are free in the queue yet');
      return;
    }
    const [p1, p2, p3, p4] = players;
    const teamA = [p1, p2],
      teamB = [p3, p4];
    const ids = req.playerIds;
    setCourts(prev => prev.map(c => c.id === open.id ? {
      ...c,
      players: {
        teamA,
        teamB
      },
      startTime: Date.now()
    } : c));
    setQueue(prev => prev.filter(p => !ids.includes(p.id)));
    setRequestedGames(prev => prev.filter(r => r.id !== req.id));
    roundsFiredRef.current += 1;
    const fCount = players.filter(p => p.gender === 'F').length;
    const matchType = fCount === 2 ? 'Mixed Doubles' : fCount === 4 ? "Women's Doubles" : "Men's Doubles";
    showNotif(`Court ${open.id} — 🎯 Requested ${matchType} started!`);
  };

  // ── Test Simulation ──────────────────────────────────────────────────
  const runSimulation = targetGames => {
    if (matchMode === 'Manual') {
      showNotif('Switch to Auto mode to run simulation');
      return;
    }
    setSimModal(false);
    setSimRunning(true);
    setSimProgress(0);
    setSimTarget(targetGames);
    let localQueue = [...queue];
    let localCourts = courts.map(c => ({
      ...c
    }));
    let localHistory = [...history];
    let localAssignCount = assignCount.current;
    let localSbMixedCount = sbMixedCount.current;
    let localOlStreak = olSameGenderStreak.current;
    let gamesCompleted = 0;
    const step = () => {
      if (gamesCompleted >= targetGames) {
        setQueue(localQueue);
        setCourts(localCourts);
        setHistory(localHistory);
        assignCount.current = localAssignCount;
        sbMixedCount.current = localSbMixedCount;
        olSameGenderStreak.current = localOlStreak;
        setSimRunning(false);
        setSimProgress(targetGames);
        showNotif('Simulation done! ' + gamesCompleted + ' games completed.');
        return;
      }

      // Fill all open courts
      let filledAny = false;
      for (let ci = 0; ci < localCourts.length; ci++) {
        if (!localCourts[ci].enabled || localCourts[ci].players) continue;
        if (localQueue.length < 4) break;
        localAssignCount += 1;
        let forceMixed = false;
        if (matchMode === 'Same Level') forceMixed = localAssignCount % 3 === 0;
        if (matchMode === 'Open Level' || matchMode === 'OP Multi Group' || matchMode === 'OP Meet') forceMixed = forceMixedEnabled && localOlStreak >= 2;
        if (matchMode === 'Skill Based') {
          localSbMixedCount += 1;
          forceMixed = localSbMixedCount % 3 === 0;
        }
        const match = findMatch(localQueue.slice(0, 20), matchMode, forceMixed, null);
        if (!match) break;
        const {
          teamA,
          teamB,
          ids
        } = match;
        localCourts[ci] = {
          ...localCourts[ci],
          players: {
            teamA,
            teamB
          },
          startTime: Date.now()
        };
        localQueue = localQueue.filter(p => !ids.includes(p.id));
        filledAny = true;
      }

      // End games on all active courts with proper pickleball scores
      let endedAny = false;
      for (let ci = 0; ci < localCourts.length; ci++) {
        if (!localCourts[ci].players || gamesCompleted >= targetGames) continue;
        const {
          teamA,
          teamB
        } = localCourts[ci].players;
        // Generate a realistic pickleball score: winner gets 11, loser gets 0-10
        // If loser gets 10, winner must get 12 (win by 2)
        const loserScore = Math.floor(Math.random() * 11); // 0–10
        const winnerScore = loserScore === 10 ? 12 : 11;
        const teamAWins = Math.random() < 0.5;
        const sA = teamAWins ? winnerScore : loserScore;
        const sB = teamAWins ? loserScore : winnerScore;
        const winner = sA > sB ? 'A' : 'B';
        localHistory.push({
          id: Date.now() + ci + gamesCompleted,
          courtId: localCourts[ci].id,
          teamA,
          teamB,
          scoreA: sA,
          scoreB: sB,
          winner,
          duration: Math.floor(Math.random() * 10) + gameTime - 5,
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        });
        localQueue = [...localQueue, ...teamA.map(p => ({ ...p, queuedAt: Date.now() })), ...teamB.map(p => ({ ...p, queuedAt: Date.now() }))];
        // Track games played for fairness scoring
        [...teamA, ...teamB].forEach(p => {
          gamesPlayedRef.current[p.id] = (gamesPlayedRef.current[p.id] || 0) + 1;
        });
        // Update Open Level gender streak (also used by OP Multi Group / OP Meet, same logic)
        if (matchMode === 'Open Level' || matchMode === 'OP Multi Group' || matchMode === 'OP Meet') {
          const fCount = [...teamA, ...teamB].filter(p => p.gender === 'F').length;
          const isMixed = fCount === 2;
          localOlStreak = isMixed ? 0 : localOlStreak + 1;
        }
        localCourts[ci] = {
          ...localCourts[ci],
          players: null,
          startTime: null
        };
        gamesCompleted++;
        endedAny = true;
      }
      setSimProgress(gamesCompleted);
      if (!filledAny && !endedAny) {
        setQueue(localQueue);
        setCourts(localCourts);
        setHistory(localHistory);
        setSimRunning(false);
        showNotif('Simulation stopped at ' + gamesCompleted + ' — no valid match found.');
        return;
      }
      setTimeout(step, 0);
    };
    setTimeout(step, 50);
  };
  // ─────────────────────────────────────────────────────────────────────

  const startManual = courtId => {
    setManualCourt(courtId);
    setManualSelected([]);
  };
  const toggleManualPlayer = p => {
    setManualSelected(prev => prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : prev.length < 4 ? [...prev, p] : prev);
  };
  const confirmManual = () => {
    if (manualSelected.length !== 4) {
      showNotif('Select exactly 4 players');
      return;
    }
    const [p1, p2, p3, p4] = manualSelected;
    const tA = [p1, p2],
      tB = [p3, p4];
    if (!genderValid(tA, tB, matchMode)) {
      showNotif('❌ Invalid gender mix! If a female is present, each team must have exactly 1 female (mixed doubles only).');
      return;
    }
    const ids = manualSelected.map(p => p.id);
    setCourts(prev => prev.map(c => c.id === manualCourt ? {
      ...c,
      players: {
        teamA: tA,
        teamB: tB
      },
      startTime: Date.now()
    } : c));
    setQueue(prev => prev.filter(p => !ids.includes(p.id)));
    setManualCourt(null);
    setManualSelected([]);
    roundsFiredRef.current += 1;
    const fCntM = [...tA, ...tB].filter(p => p.gender === 'F').length;
    const matchTypeM = matchMode === 'Open Level' ? 'Open Levels' : matchMode === 'OP Multi Group' ? 'Multi Group' : matchMode === 'OP Meet' ? 'Team Meet' : fCntM === 2 ? 'Mixed Doubles' : fCntM === 4 ? "Women's Doubles" : "Men's Doubles";
    showNotif(`Court ${manualCourt} — ${matchTypeM} started!`);
  };
  const endGame = courtId => {
    const court = courts.find(c => c.id === courtId);
    if (!court?.players) return;
    setScoreModal({
      courtId,
      players: court.players,
      startTime: court.startTime
    });
    setModalTeamA([...court.players.teamA]);
    setModalTeamB([...court.players.teamB]);
    setScoreA('');
    setScoreB('');
    setWinLoseWinner(null);
  };

  // Swap two players on a court (used during live rearrange)
  const swapCourtPlayers = (courtId, idA, idB) => {
    setCourts(prev => prev.map(c => {
      if (c.id !== courtId || !c.players) return c;
      const allPlayers = [...c.players.teamA, ...c.players.teamB];
      const pA = allPlayers.find(p => p.id === idA);
      const pB = allPlayers.find(p => p.id === idB);
      if (!pA || !pB) return c;
      const newTeamA = c.players.teamA.map(p => p.id === idA ? pB : p.id === idB ? pA : p);
      const newTeamB = c.players.teamB.map(p => p.id === idA ? pB : p.id === idB ? pA : p);
      return {
        ...c,
        players: {
          teamA: newTeamA,
          teamB: newTeamB
        }
      };
    }));
  };

  // Swap ONE player from one court with ONE player from a different court —
  // everyone else in both games stays exactly where they are. Both courts
  // keep their own timers running since this isn't treated as ending
  // either game.
  const swapAcrossCourts = (courtIdA, playerIdA, courtIdB, playerIdB) => {
    if (courtIdA === courtIdB) return;
    const courtA = courts.find(c => c.id === courtIdA);
    const courtB = courts.find(c => c.id === courtIdB);
    if (!courtA?.players || !courtB?.players) return;
    const allA = [...courtA.players.teamA, ...courtA.players.teamB];
    const allB = [...courtB.players.teamA, ...courtB.players.teamB];
    const pA = allA.find(p => p.id === playerIdA);
    const pB = allB.find(p => p.id === playerIdB);
    if (!pA || !pB) return;
    setCourts(prev => prev.map(c => {
      if (c.id === courtIdA) {
        return {
          ...c,
          players: {
            teamA: c.players.teamA.map(p => p.id === playerIdA ? pB : p),
            teamB: c.players.teamB.map(p => p.id === playerIdA ? pB : p)
          }
        };
      }
      if (c.id === courtIdB) {
        return {
          ...c,
          players: {
            teamA: c.players.teamA.map(p => p.id === playerIdB ? pA : p),
            teamB: c.players.teamB.map(p => p.id === playerIdB ? pA : p)
          }
        };
      }
      return c;
    }));
    showNotif(`Swapped ${pA.name} (Court ${courtIdA}) with ${pB.name} (Court ${courtIdB})`);
  };

  // Move (or swap) a court's current game to another court.
  // If the target court is empty, the game simply moves there.
  // If the target court already has an active game, the two courts swap games.
  const moveGameToCourt = (fromCourtId, toCourtId) => {
    if (fromCourtId === toCourtId) return;
    const fromCourt = courts.find(c => c.id === fromCourtId);
    const toCourt = courts.find(c => c.id === toCourtId);
    if (!fromCourt?.players) return;
    const wasSwap = !!toCourt?.players;
    setCourts(prev => prev.map(c => {
      if (c.id === fromCourtId) {
        return {
          ...c,
          players: toCourt?.players || null,
          startTime: toCourt?.players ? toCourt.startTime : null
        };
      }
      if (c.id === toCourtId) {
        return {
          ...c,
          players: fromCourt.players,
          startTime: fromCourt.startTime
        };
      }
      return c;
    }));
    showNotif(wasSwap ? `Swapped games between Court ${fromCourtId} and Court ${toCourtId}!` : `Moved game from Court ${fromCourtId} to Court ${toCourtId}!`);
  };

  // Replace a player on a court with a player from the queue.
  // The removed player goes back to the front of the queue (they just sat down).
  const replaceCourtPlayer = (courtId, outPlayerId, inPlayer) => {
    const court = courts.find(c => c.id === courtId);
    if (!court?.players) return;
    const allOnCourt = [...court.players.teamA, ...court.players.teamB];
    const outPlayer = allOnCourt.find(p => p.id === outPlayerId);
    setCourts(prev => prev.map(c => {
      if (c.id !== courtId || !c.players) return c;
      const newTeamA = c.players.teamA.map(p => p.id === outPlayerId ? inPlayer : p);
      const newTeamB = c.players.teamB.map(p => p.id === outPlayerId ? inPlayer : p);
      return {
        ...c,
        players: {
          teamA: newTeamA,
          teamB: newTeamB
        }
      };
    }));
    // Remove replacement from queue; put removed player at front so they're next up
    setQueue(prev => {
      const withoutIn = prev.filter(p => p.id !== inPlayer.id);
      const requeuedOut = outPlayer ? { ...outPlayer, queuedAt: Date.now() } : null;
      return requeuedOut ? [requeuedOut, ...withoutIn] : withoutIn;
    });
    setReplacingPlayer(null);
    showNotif(`${inPlayer.name} subbed in for ${outPlayer?.name || 'player'}!`);
  };

  // Auto-remove a player from an active court and fill the slot using
  // the same pairing-score algorithm. The removed player goes front of queue.
  const autoRemoveAndReplace = (courtId, outPlayerId) => {
    const court = courts.find(c => c.id === courtId);
    if (!court?.players) return;
    if (queue.length === 0) {
      showNotif('No players in queue to replace with!');
      return;
    }
    const allOnCourt = [...court.players.teamA, ...court.players.teamB];
    const outPlayer = allOnCourt.find(p => p.id === outPlayerId);
    if (!outPlayer) return;
    const inTeamA = court.players.teamA.some(p => p.id === outPlayerId);
    const remainingTeamA = court.players.teamA.filter(p => p.id !== outPlayerId);
    const remainingTeamB = court.players.teamB.filter(p => p.id !== outPlayerId);

    // Group/Team eligibility is a hard requirement — never cross a group or
    // team boundary, even as a fallback. Gender-match, by contrast, is only
    // a soft preference (falls back to the first eligible candidate).
    const teammateOut = (inTeamA ? remainingTeamA : remainingTeamB)[0];
    const eligible = queue.filter(candidate => {
      if (matchMode === 'OP Multi Group' && teammateOut?.group) return candidate.group === teammateOut.group;
      if (matchMode === 'OP Meet' && teammateOut?.team) return candidate.team === teammateOut.team;
      return true;
    });
    if (!eligible.length) {
      showNotif(matchMode === 'OP Multi Group' ? 'No players from the same group in queue to auto-fill with!' : matchMode === 'OP Meet' ? 'No players from the same team in queue to auto-fill with!' : 'No players in queue to replace with!');
      return;
    }

    // Try each eligible candidate; pick lowest pairing-history score
    // that also passes gender validation for the current mode
    let bestCandidate = null;
    let bestScore = Infinity;
    for (const candidate of eligible) {
      const proposedTeamA = inTeamA ? [...remainingTeamA, candidate] : remainingTeamA;
      const proposedTeamB = inTeamA ? remainingTeamB : [...remainingTeamB, candidate];
      if (!genderValid(proposedTeamA, proposedTeamB, matchMode)) continue;
      const score = scoreMatch(proposedTeamA, proposedTeamB);
      if (score < bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    // Fallback: no gender-valid candidate found, use the first eligible one
    if (!bestCandidate) bestCandidate = eligible[0];
    setCourts(prev => prev.map(c => {
      if (c.id !== courtId || !c.players) return c;
      const newTeamA = c.players.teamA.map(p => p.id === outPlayerId ? bestCandidate : p);
      const newTeamB = c.players.teamB.map(p => p.id === outPlayerId ? bestCandidate : p);
      return {
        ...c,
        players: {
          teamA: newTeamA,
          teamB: newTeamB
        }
      };
    }));
    setQueue(prev => {
      const withoutIn = prev.filter(p => p.id !== bestCandidate.id);
      const requeuedOut = outPlayer ? { ...outPlayer, queuedAt: Date.now() } : null;
      return requeuedOut ? [requeuedOut, ...withoutIn] : withoutIn;
    });
    setReplacingPlayer(null);
    const msg = 'Auto-filled: ' + bestCandidate.name + ' in for ' + outPlayer.name + '!';
    showNotif(msg);
  };
  const submitScore = () => {
    if (!scoreModal) return;
    if (!scoringEnabled && winLoseEnabled && !winLoseWinner) {
      showNotif('Select who won first!');
      return;
    }
    const sA = scoringEnabled ? parseInt(scoreA) || 0 : 0;
    const sB = scoringEnabled ? parseInt(scoreB) || 0 : 0;
    const {
      courtId,
      startTime
    } = scoreModal;
    const duration = startTime ? Math.floor((Date.now() - startTime) / 60000) : 0;
    const winner = scoringEnabled ? sA > sB ? 'A' : sB > sA ? 'B' : 'tie' : winLoseEnabled && winLoseWinner ? winLoseWinner : 'tie';

    // Record pairings BEFORE updating state so history is live for next findMatch
    phRecord(modalTeamA, modalTeamB);
    // Record last-played timestamp and games count
    const finishTime = Date.now();
    [...modalTeamA, ...modalTeamB].forEach(p => {
      gamesPlayedRef.current[p.id] = (gamesPlayedRef.current[p.id] || 0) + 1;
    });
    // Update Open Level gender streak (also used by OP Multi Group / OP Meet, same logic)
    if (matchMode === 'Open Level' || matchMode === 'OP Multi Group' || matchMode === 'OP Meet') {
      const fCount = [...modalTeamA, ...modalTeamB].filter(p => p.gender === 'F').length;
      const isMixed = fCount === 2;
      olSameGenderStreak.current = isMixed ? 0 : olSameGenderStreak.current + 1;
    }
    const returningPlayers = [...modalTeamA, ...modalTeamB].map(p => ({
      ...p,
      queuedAt: finishTime
    }));
    const newHistEntry = {
      id: Date.now(),
      courtId,
      teamA: modalTeamA,
      teamB: modalTeamB,
      scoreA: sA,
      scoreB: sB,
      winner,
      duration,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    const updatedHistory = [...history, newHistEntry];

    // Recompute playerStats with this game included
    const updatedStats = {};
    updatedHistory.forEach(g => {
      const all = [...g.teamA.map(p => ({
        ...p,
        team: 'A'
      })), ...g.teamB.map(p => ({
        ...p,
        team: 'B'
      }))];
      all.forEach(({
        id,
        name,
        level,
        team
      }) => {
        if (!updatedStats[id]) updatedStats[id] = {
          name,
          level,
          games: 0,
          wins: 0
        };
        updatedStats[id].games++;
        const won = team === 'A' && g.winner === 'A' || team === 'B' && g.winner === 'B';
        if (won) updatedStats[id].wins++;
      });
    });
    const updatedQueue = [...queue, ...returningPlayers];

    // Check if any requested game's "all others played" condition is now met.
    // When it is, mark it readyToFire — but do NOT steal a court or skip the queue.
    // The 4 players remain in the queue at their natural positions and will be
    // grouped together by autoAssign when it's genuinely their turn.
    const nowReadyIds = new Set();
    if (matchMode !== 'Manual') {
      for (const req of requestedGames) {
        if (req.readyToFire) continue; // already marked
        const othersDone = Object.entries(req.otherBaselines || {}).every(([id, baseline]) => {
          return (updatedStats[id]?.games || 0) > baseline;
        });
        if (othersDone) nowReadyIds.add(req.id);
      }
    }
    setHistory(updatedHistory);
    setQueue(updatedQueue);
    setCourts(prev => prev.map(c => c.id === courtId ? {
      ...c,
      players: null,
      startTime: null
    } : c));
    setScoreModal(null);
    if (nowReadyIds.size > 0) {
      setRequestedGames(prev => prev.map(r => nowReadyIds.has(r.id) ? {
        ...r,
        readyToFire: true
      } : r));
      showNotif(`Court ${courtId} — Game recorded! 🎯 Requested game is now ready — fires when these players reach the front of the queue.`);
    } else {
      showNotif(`Court ${courtId} — Game recorded!`);
    }

    // Auto-save after every game
    setTimeout(() => {
      const snap = {
        ...buildSnapshot(),
        name: sessionName
      };
      const updated = savedSessions.filter(s => s.name !== snap.name).concat(snap);
      setSavedSessions(updated);
      localStorage.setItem('dr_saved_sessions', JSON.stringify(updated));
      localStorage.setItem('dr_current_session_name', JSON.stringify(snap.name));
      localStorage.setItem('dr_session_started', sessionStarted);
      setLastSaved(new Date());
    }, 0);
  };
  const addPlayer = () => {
    if (!newName.trim()) return;
    if (matchMode === 'OP Multi Group' && !newGroup) {
      showNotif('Select a Group for this player (add one in the Group List tab first)');
      return;
    }
    if (matchMode === 'OP Meet' && !newTeam) {
      showNotif('Select a Team for this player (add one in the Team List tab first)');
      return;
    }
    if (matchMode === 'OP Meet' && addingPair && !newPartnerTeam) {
      showNotif('Select a Team for the partner too');
      return;
    }
    if (matchMode === 'OP Multi Group' && addingPair && !newPartnerGroup) {
      showNotif('Select a Group for the partner too');
      return;
    }
    // Check for duplicate name in queue
    const allCurrentNames = new Set([...queue.map(p => p.name.toLowerCase()), ...courts.flatMap(c => c.players ? [...c.players.teamA, ...c.players.teamB].map(p => p.name.toLowerCase()) : [])]);
    if (allCurrentNames.has(newName.trim().toLowerCase())) {
      showNotif(`"${newName.trim()}" is already in the session`);
      return;
    }
    if (addingPair) {
      if (!newPartnerName.trim()) {
        showNotif('Enter partner name too');
        return;
      }
      if (allCurrentNames.has(newPartnerName.trim().toLowerCase())) {
        showNotif(`"${newPartnerName.trim()}" is already in the session`);
        return;
      }
      if (newName.trim().toLowerCase() === newPartnerName.trim().toLowerCase()) {
        showNotif('Partner must have a different name');
        return;
      }
      const id1 = uid(),
        id2 = uid();
      const p1 = {
        id: id1,
        name: newName.trim(),
        level: newLevel,
        gender: newGender,
        partnerId: id2,
        group: matchMode === 'OP Multi Group' ? newGroup : null,
        team: matchMode === 'OP Meet' ? newTeam : null,
        queuedAt: Date.now()
      };
      const p2 = {
        id: id2,
        name: newPartnerName.trim(),
        level: newPartnerLevel,
        gender: newPartnerGender,
        partnerId: id1,
        group: matchMode === 'OP Multi Group' ? newPartnerGroup : null,
        team: matchMode === 'OP Meet' ? newPartnerTeam : null,
        queuedAt: Date.now()
      };
      // Record join round for late-arrival fairness (only set once, never overwritten)
      if (joinRoundRef.current[id1] === undefined) joinRoundRef.current[id1] = roundsFiredRef.current;
      if (joinRoundRef.current[id2] === undefined) joinRoundRef.current[id2] = roundsFiredRef.current;
      setQueue(prev => [...prev, p1, p2]);
      setPlayerList(prev => {
        const names = new Set(prev.map(p => p.name.toLowerCase()));
        const toAdd = [p1, p2].filter(p => !names.has(p.name.toLowerCase()));
        return [...prev, ...toAdd];
      });
      setNewName('');
      setNewPartnerName('');
      if (newLevel !== newPartnerLevel && newLevel !== 'Open' && newPartnerLevel !== 'Open') {
        showNotif(`${p1.name} & ${p2.name} added as a fixed pair! Heads up: ${newLevel} + ${newPartnerLevel} won't be matched in Same Level mode until levels match.`);
      } else {
        showNotif(`${p1.name} & ${p2.name} added as a fixed pair!`);
      }
    } else {
      const p = {
        id: uid(),
        name: newName.trim(),
        level: newLevel,
        gender: newGender,
        partnerId: null,
        group: matchMode === 'OP Multi Group' ? newGroup : null,
        team: matchMode === 'OP Meet' ? newTeam : null,
        queuedAt: Date.now()
      };
      // Record join round for late-arrival fairness (only set once, never overwritten)
      if (joinRoundRef.current[p.id] === undefined) joinRoundRef.current[p.id] = roundsFiredRef.current;
      setQueue(prev => [...prev, p]);
      setPlayerList(prev => {
        if (prev.some(x => x.name.toLowerCase() === p.name.toLowerCase())) return prev;
        return [...prev, p];
      });
      setNewName('');
      showNotif(`${p.name} added to waitlist!`);
    }
  };

  // Unlink a fixed pair (e.g. if one is removed)
  const removeFromQueue = id => {
    setQueue(prev => {
      const target = prev.find(p => p.id === id);
      // If they had a partner, unlink the partner too
      if (target?.partnerId) {
        return prev.filter(p => p.id !== id).map(p => p.id === target.partnerId ? {
          ...p,
          partnerId: null
        } : p);
      }
      return prev.filter(p => p.id !== id);
    });
  };
  const exportPlayerListXLSX = () => {
    if (!window.XLSX) {
      showNotif('Excel library not loaded yet, try again');
      return;
    }
    const rows = playerList.map((p, i) => {
      const partner = p.partnerId ? playerList.find(x => x.id === p.partnerId) : null;
      return {
        '#': i + 1,
        Name: p.name,
        Level: p.level,
        Gender: p.gender === 'M' ? 'Male' : 'Female',
        'Fixed Partner': partner ? partner.name : '',
        'Games Played': playerStats[p.id]?.games || 0
      };
    });
    const ws = window.XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws['!cols'] = [{
      wch: 4
    }, {
      wch: 20
    }, {
      wch: 14
    }, {
      wch: 8
    }, {
      wch: 20
    }, {
      wch: 12
    }];
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Player List');
    const date = new Date().toISOString().slice(0, 10);
    window.XLSX.writeFile(wb, `player_list_${date}.xlsx`);
    showNotif(`Exported ${rows.length} players to Excel!`);
  };
  const importPlayerListXLSX = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.XLSX) {
      showNotif('Excel library not loaded yet, try again');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = window.XLSX.read(ev.target.result, {
          type: 'binary'
        });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = window.XLSX.utils.sheet_to_json(ws);
        if (!rows.length) {
          showNotif('No data found in file');
          return;
        }

        // Build a name→id map for resolving fixed partners
        const nameToId = {};
        const newPlayers = rows.map(row => {
          const id = uid();
          const name = (row['Name'] || row['name'] || '').toString().trim();
          if (name) nameToId[name.toLowerCase()] = id;
          return {
            id,
            name: name || 'Unknown',
            level: LEVELS.includes(row['Level'] || row['level']) ? row['Level'] || row['level'] : 'Beginner',
            gender: (row['Gender'] || row['gender'] || '').toString().toLowerCase().startsWith('f') ? 'F' : 'M',
            _partnerName: (row['Fixed Partner'] || row['fixed partner'] || '').toString().trim().toLowerCase(),
            partnerId: null
          };
        }).filter(p => p.name && p.name !== 'Unknown');

        // Resolve partner links by name
        newPlayers.forEach(p => {
          if (p._partnerName) {
            const partnerId = nameToId[p._partnerName];
            if (partnerId) p.partnerId = partnerId;
          }
          delete p._partnerName;
        });
        // Import adds new players to both the master Player List and
        // today's Waitlist, so they're ready to be matched immediately.
        setPlayerList(prev => {
          const existingNames = new Set(prev.map(p => p.name.toLowerCase()));
          const fresh = newPlayers.filter(p => !existingNames.has(p.name.toLowerCase()));
          return [...prev, ...fresh];
        });
        setQueue(prev => {
          const existingNames = new Set(prev.map(p => p.name.toLowerCase()));
          const fresh = newPlayers.filter(p => !existingNames.has(p.name.toLowerCase()));
          // Record join round for each newly added player
          fresh.forEach(p => {
            if (joinRoundRef.current[p.id] === undefined) joinRoundRef.current[p.id] = roundsFiredRef.current;
          });
          return [...prev, ...fresh];
        });
        showNotif(`Imported ${newPlayers.length} players from Excel!`);
      } catch (err) {
        showNotif('Failed to read file — check format');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input so the same file can be re-imported
    e.target.value = '';
  };
  // Stats
  const activeCourts = courts.filter(c => c.enabled && c.players).length;
  const openCourts = courts.filter(c => c.enabled && !c.players).length;
  const onCourtCount = activeCourts * 4;
  // Estimated average wait time for players currently in the waitlist.
  // Formula: (Total players / Active players - 1) × Game time
  //   Total players  = players in queue + players on court
  //   Active players = selected courts × 4 (a constant — how many players
  //   are physically sitting on a court right now doesn't change this;
  //   it's numCourts × 4, not activeCourts × 4)
  //   Game time      = the configured game time limit
  // Min/Max are the same ratio floored/ceiled instead of rounded, so they
  // track totalPlayers just like avg does — they won't drift just because
  // the in-queue/on-court split changes while totalPlayers stays the same.
  const activePlayers = numCourts * 4;
  const totalPlayers = queue.length + onCourtCount;
  const waitRounds = activePlayers > 0 ? totalPlayers / activePlayers - 1 : 0;
  const avgWaitMinutes = activePlayers > 0 && queue.length > 0 ? Math.max(0, Math.round(waitRounds * gameTime * 10) / 10) : 0;
  const minWaitMinutes = activePlayers > 0 && queue.length > 0 ? Math.max(0, Math.floor(waitRounds) * gameTime) : 0;
  const maxWaitMinutes = activePlayers > 0 && queue.length > 0 ? Math.max(0, Math.ceil(waitRounds) * gameTime) : 0;
  // Fallback "joined queue" time for players saved before wait-time tracking existed.
  const sessionStartedMs = new Date(sessionStarted).getTime();
  // Player Stats is a current standings view, not a game log — so identity
  // fields (name/level/gender) should reflect the CURRENT Player List entry,
  // not whatever this player's name/level happened to be in their first-ever
  // recorded game. Numeric fields (games/wins/pts) still legitimately
  // aggregate from history, since those are real running totals.
  const playerListById = {};
  playerList.forEach(p => {
    playerListById[p.id] = p;
  });
  const playerStats = {};
  history.forEach(g => {
    const all = [...g.teamA.map(p => ({
      ...p,
      opTeam: p.team,
      team: 'A'
    })), ...g.teamB.map(p => ({
      ...p,
      opTeam: p.team,
      team: 'B'
    }))];
    all.forEach(({
      id,
      name,
      level,
      gender,
      team,
      opTeam,
      group
    }) => {
      if (!playerStats[id]) {
        // Prefer the live Player List entry; fall back to the historical
        // snapshot only if the player was since removed from Player List.
        const current = playerListById[id];
        playerStats[id] = {
          name: current ? current.name : name,
          level: current ? current.level : level,
          gender: current ? current.gender : gender,
          // OP Meet team affiliation — prefer the player's CURRENT team tag
          // (they may have been reassigned since this game was played),
          // fall back to whatever team they were on when the game was recorded.
          opTeam: current ? current.team || null : opTeam || null,
          // OP Multi Group affiliation, same current-list-preferred logic.
          group: current ? current.group || null : group || null,
          games: 0,
          wins: 0,
          pts: 0,
          against: 0
        };
      }
      playerStats[id].games++;
      const won = team === 'A' && g.winner === 'A' || team === 'B' && g.winner === 'B';
      if (won) playerStats[id].wins++;
      playerStats[id].pts += team === 'A' ? g.scoreA : g.scoreB;
      playerStats[id].against += team === 'A' ? g.scoreB : g.scoreA;
    });
  });
  // Ranked leaderboard (by wins, then games played) — powers the Rank List
  // and Top Performer preview modals.
  const rankedPlayers = Object.entries(playerStats).map(([id, s]) => ({
    id,
    ...s
  })).sort((a, b) => b.wins - a.wins || b.games - a.games);
  const topPerformer = rankedPlayers[0] || null;
  // OP Meet: aggregate player stats up into per-team totals (wins/games/pts
  // are summed across every player currently tagged to that team). Powers
  // the "Rank List Team" preview.
  const teamStatsById = {};
  rankedPlayers.forEach(p => {
    if (!p.opTeam) return;
    if (!teamStatsById[p.opTeam]) {
      teamStatsById[p.opTeam] = {
        games: 0,
        wins: 0,
        pts: 0,
        against: 0,
        playerCount: 0
      };
    }
    const t = teamStatsById[p.opTeam];
    t.games += p.games;
    t.wins += p.wins;
    t.pts += p.pts;
    t.against += p.against;
    t.playerCount += 1;
  });
  const rankedTeams = teams.map(g => ({
    id: g.id,
    name: g.name,
    ...(teamStatsById[g.id] || { games: 0, wins: 0, pts: 0, against: 0, playerCount: 0 })
  })).sort((a, b) => b.wins - a.wins || b.games - a.games);
  const topTeamPerformer = rankedTeams.find(t => t.games > 0) || null;
  // Scope the Rank List to whichever group/team sub-tab is selected in
  // Player Stats. filteredRankLabel is shown in the preview overlay title
  // so it's clear the list is scoped, not the full roster.
  let filteredRankedPlayers = rankedPlayers;
  let filteredRankLabel = null;
  if (matchMode === 'OP Multi Group' && statsGroupFilter) {
    if (statsGroupFilter === '__unassigned__') {
      filteredRankedPlayers = rankedPlayers.filter(p => !p.group);
      filteredRankLabel = 'No Group';
    } else {
      filteredRankedPlayers = rankedPlayers.filter(p => p.group === statsGroupFilter);
      filteredRankLabel = playGroups.find(g => g.id === statsGroupFilter)?.name || null;
    }
  }
  if (matchMode === 'OP Meet' && statsTeamFilter) {
    if (statsTeamFilter === '__unassigned__') {
      filteredRankedPlayers = rankedPlayers.filter(p => !p.opTeam);
      filteredRankLabel = 'No Team';
    } else {
      filteredRankedPlayers = rankedPlayers.filter(p => p.opTeam === statsTeamFilter);
      filteredRankLabel = teams.find(t => t.id === statsTeamFilter)?.name || null;
    }
  }
  // Same filter, as [id, s] pairs — feeds the Player Stats table directly.
  const statsIdSet = new Set(filteredRankedPlayers.map(p => p.id));
  const statsEntries = Object.entries(playerStats).filter(([id]) => statsIdSet.has(id));
  const exportHistoryCSV = () => {
    const headers = ['#', 'Time', 'Court', 'Team A Players', 'Team A Levels', 'Score A', 'Score B', 'Team B Players', 'Team B Levels', 'Winner', 'Duration (min)'];
    const rows = [...history].reverse().map((g, i) => [history.length - i, g.time, `Court ${g.courtId}`, g.teamA.map(p => p.name).join(' & '), g.teamA.map(p => p.level).join(' & '), g.scoreA, g.scoreB, g.teamB.map(p => p.name).join(' & '), g.teamB.map(p => p.level).join(' & '), g.winner === 'tie' ? 'Tie' : `Team ${g.winner}`, g.duration]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {
      type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dink_republic_history_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotif('History exported to CSV!');
  };
  const exportStatsCSV = () => {
    const headers = ['Rank', 'Player', 'Level', 'Games', 'Wins', 'Losses', 'Win %', 'Points For', 'Points Against', 'Diff'];
    const rows = Object.entries(playerStats).sort((a, b) => b[1].wins - a[1].wins || b[1].games - a[1].games).map(([, s], i) => {
      const losses = s.games - s.wins;
      const winPct = s.games ? Math.round(s.wins / s.games * 100) : 0;
      const diff = s.pts - s.against;
      return [i + 1, s.name, s.level, s.games, s.wins, losses, `${winPct}%`, s.pts, s.against, diff >= 0 ? `+${diff}` : diff];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {
      type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dink_republic_stats_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotif('Player stats exported to CSV!');
  };

  // Send Top Performer / Rank List previews to the TV/display preview screen
  // instead of showing them on the main screen.
  const sendStatsToPreview = payload => {
    const sendTo = win => {
      try {
        win.postMessage(payload, '*');
      } catch (e) {}
    };
    if (previewWinRef.current && !previewWinRef.current.closed) {
      sendTo(previewWinRef.current);
    } else {
      openPreviewWindow();
      const attempts = [600, 1200, 2000];
      attempts.forEach(ms => setTimeout(() => {
        if (previewWinRef.current && !previewWinRef.current.closed) sendTo(previewWinRef.current);
      }, ms));
    }
  };
  const sendTopPerformerToPreview = () => {
    sendStatsToPreview({
      type: 'DR_TOP_PERFORMER',
      topPerformer
    });
    showNotif('Top Performer sent to preview screen!');
  };
  const sendTopTeamPerformerToPreview = () => {
    sendStatsToPreview({
      type: 'DR_TOP_TEAM_PERFORMER',
      topTeamPerformer
    });
    showNotif('Top Team Performer sent to preview screen!');
  };
  const sendRankListToPreview = () => {
    sendStatsToPreview({
      type: 'DR_RANK_LIST',
      rankedPlayers: filteredRankedPlayers,
      label: filteredRankLabel
    });
    showNotif('Rank List sent to preview screen!');
  };
  const sendRankListTeamToPreview = () => {
    sendStatsToPreview({
      type: 'DR_RANK_LIST_TEAM',
      rankedTeams
    });
    showNotif('Rank List Team sent to preview screen!');
  };
  // Keep an already-open Rank List overlay live: whenever a game is recorded
  // (history changes) or the group/team filter changes, silently push the
  // refreshed tally. show:false tells the preview window to update the
  // numbers in place without re-opening the overlay if the user had closed it.
  useEffect(() => {
    if (previewWinRef.current && !previewWinRef.current.closed) {
      try {
        previewWinRef.current.postMessage({
          type: 'DR_RANK_LIST',
          rankedPlayers: filteredRankedPlayers,
          label: filteredRankLabel,
          show: false
        }, '*');
        previewWinRef.current.postMessage({
          type: 'DR_RANK_LIST_TEAM',
          rankedTeams,
          show: false
        }, '*');
      } catch (e) {}
    }
  }, [history, statsGroupFilter, statsTeamFilter]);
  if (!authUser) {
    return /*#__PURE__*/React.createElement(PinLoginScreen, {
      onLogin: login,
      users: users
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, notification && /*#__PURE__*/React.createElement("div", {
    className: "notification"
  }, "✓ ", notification), /*#__PURE__*/React.createElement("div", {
    className: "header"
  }, /*#__PURE__*/React.createElement("h1", null, "🏓 DINK Republic Open Play"), /*#__PURE__*/React.createElement("p", null, "Court Manager · Doubles Open Play System")), /*#__PURE__*/React.createElement("div", {
    className: "session-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "session-info"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, "📋"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "session-name"
  }, sessionName), /*#__PURE__*/React.createElement("div", {
    className: "session-meta"
  }, "Started ", new Date(sessionStarted).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }), lastSaved && /*#__PURE__*/React.createElement(React.Fragment, null, " · Saved ", lastSaved.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "session-actions"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: authUser.role === 'Superadmin' ? 'var(--gold)' : 'var(--text-muted)',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      marginRight: 4
    },
    title: `Logged in as ${authUser.name} (${authUser.role})`
  }, authUser.role === 'Superadmin' ? '🔑' : '👤', " ", authUser.name), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: logout,
    title: "Lock the app and require a PIN to continue"
  }, "🔒 Lock"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => setLightMode(v => !v),
    title: lightMode ? "Switch to dark mode" : "Switch to light mode"
  }, lightMode ? "🌙 Dark" : "☀️ Light"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => setSessionModal('load'),
    title: "Load a saved session"
  }, "📂 Load"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-teal btn-sm",
    onClick: () => saveSession(),
    title: "Save current session"
  }, "💾 Save"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-gold btn-sm",
    onClick: () => {
      setNewSessionName('');
      setSessionModal('new');
    },
    title: "Start a fresh session"
  }, "＋ New Session"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    onClick: openPreviewWindow,
    title: "Open TV/display preview in a new window",
    style: {
      background: '#7c3aed',
      color: '#fff',
      border: 'none'
    }
  }, "📺 Preview Screen"), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      cursor: 'pointer',
      fontSize: 12,
      fontWeight: 600,
      color: autoAlert ? 'var(--gold)' : 'var(--text-muted)',
      background: autoAlert ? 'var(--gold-dim)' : 'var(--surface3)',
      border: `1px solid ${autoAlert ? '#ffd60055' : 'var(--border)'}`,
      borderRadius: 6,
      padding: '5px 10px',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap'
    },
    title: "Show a popup with player names whenever a game starts"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: autoAlert,
    onChange: e => setAutoAlert(e.target.checked),
    style: {
      accentColor: 'var(--gold)',
      width: 13,
      height: 13,
      cursor: 'pointer'
    }
  }), "🔔 Auto Alert"), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      cursor: 'pointer',
      fontSize: 12,
      fontWeight: 600,
      color: scoringEnabled ? 'var(--green)' : 'var(--text-muted)',
      background: scoringEnabled ? 'var(--green-dim)' : 'var(--surface3)',
      border: `1px solid ${scoringEnabled ? '#00c85355' : 'var(--border)'}`,
      borderRadius: 6,
      padding: '5px 10px',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap'
    },
    title: "When enabled, prompts for score entry when a match ends"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: scoringEnabled,
    onChange: e => {
      setScoringEnabled(e.target.checked);
      if (e.target.checked) setWinLoseEnabled(false);
    },
    style: {
      accentColor: 'var(--green)',
      width: 13,
      height: 13,
      cursor: 'pointer'
    }
  }), "🏆 Scoring"), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      cursor: 'pointer',
      fontSize: 12,
      fontWeight: 600,
      color: winLoseEnabled ? 'var(--gold)' : 'var(--text-muted)',
      background: winLoseEnabled ? 'var(--gold-dim)' : 'var(--surface3)',
      border: `1px solid ${winLoseEnabled ? '#ffd60055' : 'var(--border)'}`,
      borderRadius: 6,
      padding: '5px 10px',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap'
    },
    title: "When enabled, record who won without entering a score"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: winLoseEnabled,
    onChange: e => {
      setWinLoseEnabled(e.target.checked);
      if (e.target.checked) setScoringEnabled(false);
    },
    style: {
      accentColor: 'var(--gold)',
      width: 13,
      height: 13,
      cursor: 'pointer'
    }
  }), "🥇 Win/Lose"), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      cursor: 'pointer',
      fontSize: 12,
      fontWeight: 600,
      color: showUpNext ? 'var(--blue)' : 'var(--text-muted)',
      background: showUpNext ? 'var(--blue-dim)' : 'var(--surface3)',
      border: `1px solid ${showUpNext ? 'var(--blue)' : 'var(--border)'}`,
      borderRadius: 6,
      padding: '5px 10px',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap'
    },
    title: "Preview the next matches from the queue"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: showUpNext,
    onChange: e => setShowUpNext(e.target.checked),
    style: {
      accentColor: 'var(--blue)',
      width: 13,
      height: 13,
      cursor: 'pointer'
    }
  }), "👁 Up Next"))), /*#__PURE__*/React.createElement("div", {
    className: "stat-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "val",
    style: {
      color: 'var(--gold)'
    }
  }, queue.length), /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "In Queue")), /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "val",
    style: {
      color: 'var(--green)'
    }
  }, onCourtCount), /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "On Court")), /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "val",
    style: {
      color: 'var(--blue)'
    }
  }, openCourts), /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Open Courts")), /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "val",
    style: {
      color: 'var(--teal)'
    }
  }, history.length), /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Games Done"))), /*#__PURE__*/React.createElement("div", {
    className: "controls-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ctrl-group"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ctrl-label"
  }, "Courts"), [1, 2, 3, 4, 5, 6, 7].map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    disabled: matchMode === 'OP Multi Group',
    className: `time-btn ${courts.find(c => c.id === n)?.enabled ? 'active' : ''}`,
    title: matchMode === 'OP Multi Group' ? 'Courts are controlled by Group List in OP Multi Group mode' : courts.find(c => c.id === n)?.enabled ? `Turn Court ${n} off` : `Turn Court ${n} on`,
    style: matchMode === 'OP Multi Group' ? {
      opacity: 0.4,
      cursor: 'not-allowed'
    } : undefined,
    onClick: () => matchMode !== 'OP Multi Group' && toggleCourt(n)
  }, n))), /*#__PURE__*/React.createElement("div", {
    className: "divider-v"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ctrl-group"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ctrl-label"
  }, "Time Limit"), TIME_OPTIONS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: `time-btn ${gameTime === t ? 'active' : ''}`,
    onClick: () => setGameTime(t)
  }, t, "m"))), /*#__PURE__*/React.createElement("div", {
    className: "divider-v"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ctrl-group"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ctrl-label"
  }, "Match Mode"), /*#__PURE__*/React.createElement("select", {
    value: matchMode === 'Manual' ? lastDropdownMode : matchMode,
    disabled: matchMode === 'Manual',
    onChange: e => {
      const val = e.target.value;
      setLastDropdownMode(val);
      setMatchMode(val);
    },
    className: "mode-select",
    style: {
      background: 'var(--surface3)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '5px 8px',
      fontSize: 12,
      fontWeight: 600,
      cursor: matchMode === 'Manual' ? 'not-allowed' : 'pointer',
      opacity: matchMode === 'Manual' ? 0.5 : 1
    }
  }, MATCH_MODES.filter(m => m !== 'Manual').map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, m))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer',
      fontSize: 12,
      fontWeight: 600,
      color: matchMode === 'Manual' ? 'var(--text)' : 'var(--text-muted)',
      marginLeft: 8,
      whiteSpace: 'nowrap'
    },
    title: "Switch on to disable auto-matchmaking and assign players manually"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-block',
      width: 32,
      height: 18,
      borderRadius: 9,
      background: matchMode === 'Manual' ? 'var(--green)' : 'var(--surface3)',
      border: '1px solid var(--border)',
      transition: 'background 0.15s',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: matchMode === 'Manual',
    onChange: e => {
      if (e.target.checked) {
        setMatchMode('Manual');
      } else {
        setMatchMode(lastDropdownMode);
      }
    },
    style: {
      position: 'absolute',
      opacity: 0,
      width: '100%',
      height: '100%',
      margin: 0,
      cursor: 'pointer'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 1,
      left: matchMode === 'Manual' ? 15 : 1,
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: '#fff',
      transition: 'left 0.15s',
      boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
    }
  })), "Manual")), (matchMode === 'Open Level' || matchMode === 'OP Multi Group' || matchMode === 'OP Meet') && /*#__PURE__*/React.createElement("div", {
    className: "ctrl-group"
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      cursor: 'pointer',
      fontSize: 11,
      fontWeight: 600,
      color: forceMixedEnabled ? 'var(--text-muted)' : 'var(--orange)',
      whiteSpace: 'nowrap'
    },
    title: forceMixedEnabled ? "Forces a mixed-doubles round after 2 same-gender rounds in a row. Uncheck to never force mixed." : "Gender rotation is off — mixed rounds will only happen if they naturally score best."
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: forceMixedEnabled,
    onChange: e => setForceMixedEnabled(e.target.checked),
    style: {
      accentColor: 'var(--orange)',
      width: 13,
      height: 13,
      cursor: 'pointer'
    }
  }), forceMixedEnabled ? "🔀 Forced Mixed Rotation" : "🔀 Mixed Rotation Off")), /*#__PURE__*/React.createElement("div", {
    className: "ctrl-group"
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      cursor: 'pointer',
      fontSize: 11,
      fontWeight: 600,
      color: prioritizeFreshness ? 'var(--orange)' : 'var(--text-muted)',
      whiteSpace: 'nowrap'
    },
    title: prioritizeFreshness ? "Freshness (new partner/opponent combos) is checked BEFORE wait time in every mode. Someone who's waited longest may occasionally be skipped in favor of a fresher match." : "Wait time is protected first in every mode — freshness only breaks ties between otherwise-equal matches."
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: prioritizeFreshness,
    onChange: e => setPrioritizeFreshness(e.target.checked),
    style: {
      accentColor: 'var(--orange)',
      width: 13,
      height: 13,
      cursor: 'pointer'
    }
  }), prioritizeFreshness ? "🔄 Freshness Priority" : "⏱ Wait Priority")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-green btn-sm",
    style: {
      marginLeft: 'auto'
    },
    onClick: autoAssign
  }, "▶ Auto Assign"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    style: {
      background: '#7c3aed',
      color: '#fff'
    },
    onClick: () => {
      setSimGames('96');
      setSimModal(true);
    },
    title: "Run automated game simulation"
  }, "🧪 Test Sim")), /*#__PURE__*/React.createElement("div", {
    className: "tabbar"
  }, [['courts', `Courts (${numCourts})`], ['queue', `Waitlist (${queue.length})`], ['playerlist', `Player List (${playerList.length})`], ['requests', `Requested (${requestedGames.length})`], ['history', `History (${history.length})`], ['stats', 'Player Stats'], ...(matchMode === 'OP Multi Group' ? [['grouplist', `Group List (${playGroups.length})`]] : []), ...(matchMode === 'OP Meet' ? [['teamlist', `Team List (${teams.length})`]] : []), ...(authUser.role === 'Superadmin' ? [['users', `Users (${users.length})`]] : [])].map(([key, label]) => /*#__PURE__*/React.createElement("div", {
    key: key,
    className: `tab ${activeTab === key ? 'active' : ''}`,
    onClick: () => setActiveTab(key)
  }, label))), activeTab === 'courts' && /*#__PURE__*/React.createElement("div", {
    className: "courts-grid"
  }, courts.filter(c => c.enabled).map(court => /*#__PURE__*/React.createElement("div", {
    key: court.id,
    className: `court-card ${court.players ? 'active' : 'open'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "court-header"
  }, /*#__PURE__*/React.createElement("span", {
    className: "court-name"
  }, /*#__PURE__*/React.createElement("span", {
    className: `court-status-dot ${court.players ? 'dot-green' : 'dot-gray'}`
  }), "Court ", court.id, matchMode === 'OP Multi Group' && (() => {
    const owner = playGroups.find(s => (s.courtIds || []).includes(court.id));
    return owner ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--teal)',
        marginLeft: 6
      }
    }, "🏟 ", owner.name) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--red)',
        marginLeft: 6
      }
    }, "No group");
  })()), court.players ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(CourtTimer, {
    startTime: court.startTime,
    limitMin: gameTime
  }), (() => {
    const all = [...court.players.teamA, ...court.players.teamB];
    const fCount = all.filter(p => p.gender === 'F').length;
    if (matchMode === 'Open Level' || matchMode === 'OP Multi Group' || matchMode === 'OP Meet') return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 800,
        color: 'var(--gold)',
        letterSpacing: .5,
        textTransform: 'uppercase'
      }
    }, matchMode === 'OP Multi Group' ? '🏟 Multi Group' : matchMode === 'OP Meet' ? '🤝 Team Meet' : '⚡ Open Levels');
    if (fCount === 2) return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 800,
        color: '#f06292',
        letterSpacing: .5,
        textTransform: 'uppercase'
      }
    }, "♀♂ Mixed Doubles");
    if (fCount === 4) return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 800,
        color: '#f06292',
        letterSpacing: .5,
        textTransform: 'uppercase'
      }
    }, "♀ Women's Doubles");
    return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 800,
        color: '#64b5f6',
        letterSpacing: .5,
        textTransform: 'uppercase'
      }
    }, "♂ Men's Doubles");
  })()) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-dim)'
    }
  }, "OPEN")), court.players ? /*#__PURE__*/React.createElement(React.Fragment, null, rearrangeCourt === court.id ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--gold)',
      fontWeight: 700,
      textAlign: 'center',
      background: 'var(--gold-dim)',
      borderRadius: 6,
      padding: '5px 8px',
      border: '1px solid var(--gold)55',
      marginBottom: 2
    }
  }, "↕ Drag players to swap · ", /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setRearrangeCourt(null);
      setDragPlayerId(null);
    },
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--gold)',
      cursor: 'pointer',
      fontWeight: 800,
      fontSize: 11,
      padding: 0,
      textDecoration: 'underline'
    }
  }, "Done")) : null, [{
    label: '— TEAM A —',
    players: court.players.teamA,
    team: 'A'
  }, {
    label: '— VS —',
    players: null
  }, {
    label: '— TEAM B —',
    players: court.players.teamB,
    team: 'B'
  }].map((section, si) => section.players === null ? (() => {
    // Show exact-foursome repeat count: has this SAME 4 people played
    // together before, regardless of split? Partner-repeat is already
    // shown separately above, so this deliberately does not care about
    // pairing — only whether these 4 specific players were on a court
    // together before.
    const groupRepeats = ghGet([...court.players.teamA, ...court.players.teamB].map(p => p.id));
    return /*#__PURE__*/React.createElement("div", {
      key: "vs",
      className: "team-divider",
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6
      }
    }, "— VS —", groupRepeats > 0 && /*#__PURE__*/React.createElement("span", {
      title: `These exact 4 players have been on a court together ${groupRepeats} time${groupRepeats !== 1 ? 's' : ''} before`,
      style: {
        fontSize: 9,
        fontWeight: 800,
        background: 'var(--orange-dim)',
        color: 'var(--orange)',
        borderRadius: 10,
        padding: '1px 5px',
        border: '1px solid var(--orange)44'
      }
    }, "×", groupRepeats));
  })() : /*#__PURE__*/React.createElement(React.Fragment, {
    key: section.team
  }, /*#__PURE__*/React.createElement("div", {
    className: "team-divider",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6
    }
  }, section.label, (() => {
    const [p0, p1] = section.players;
    if (!p0 || !p1) return null;
    const partnerRepeats = partnerGet(p0.id, p1.id);
    return partnerRepeats > 0 ? /*#__PURE__*/React.createElement("span", {
      title: `${p0.name} & ${p1.name} have been partners ${partnerRepeats} time${partnerRepeats !== 1 ? 's' : ''} before`,
      style: {
        fontSize: 9,
        fontWeight: 800,
        background: 'var(--blue-dim)',
        color: 'var(--blue)',
        borderRadius: 10,
        padding: '1px 5px',
        border: '1px solid var(--blue)44'
      }
    }, "🔁×", partnerRepeats) : null;
  })()), section.players.map(p => {
    const isBeingDragged = dragPlayerId === p.id;
    const isRearranging = rearrangeCourt === court.id;
    const isDropTarget = isRearranging && dragPlayerId && dragPlayerId !== p.id;
    const isBeingReplaced = replacingPlayer?.courtId === court.id && replacingPlayer?.playerId === p.id;
    const isSwapSource = crossCourtSwap?.courtId === court.id && crossCourtSwap?.playerId === p.id;
    const isSwapTarget = !!crossCourtSwap && crossCourtSwap.courtId !== court.id;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: p.id
    }, /*#__PURE__*/React.createElement("div", {
      className: "player-slot",
      draggable: isRearranging,
      onDragStart: isRearranging ? () => setDragPlayerId(p.id) : undefined,
      onDragEnd: isRearranging ? () => setDragPlayerId(null) : undefined,
      onDragOver: isDropTarget ? e => e.preventDefault() : undefined,
      onDrop: isDropTarget ? e => {
        e.preventDefault();
        swapCourtPlayers(court.id, dragPlayerId, p.id);
        setDragPlayerId(null);
      } : undefined,
      onClick: crossCourtSwap ? (isSwapTarget ? () => {
        swapAcrossCourts(crossCourtSwap.courtId, crossCourtSwap.playerId, court.id, p.id);
        setCrossCourtSwap(null);
      } : isSwapSource ? () => setCrossCourtSwap(null) : undefined) : !isRearranging && !replacingPlayer ? () => setRearrangeCourt(court.id) : undefined,
      title: isSwapSource ? 'Selected for cross-court swap — click to cancel' : isSwapTarget ? `Swap in for the selected player` : crossCourtSwap ? undefined : !isRearranging ? 'Click to rearrange players' : isDropTarget ? `Swap with ${p.name}` : 'Drag me',
      style: {
        cursor: isRearranging ? isBeingDragged ? 'grabbing' : 'grab' : 'pointer',
        opacity: isBeingDragged ? 0.45 : 1,
        border: isSwapSource ? '2px solid #ab47bc' : isSwapTarget ? '2px dashed #ab47bc' : isBeingReplaced ? '2px dashed var(--red)' : isDropTarget ? '2px dashed var(--gold)' : isRearranging ? '1px dashed var(--teal)' : undefined,
        background: isSwapSource ? '#ab47bc22' : isSwapTarget ? '#ab47bc11' : isBeingReplaced ? 'var(--red-dim)' : undefined,
        transition: 'border 0.15s, opacity 0.15s, background 0.15s',
        userSelect: 'none'
      }
    }, /*#__PURE__*/React.createElement(GenderTag, {
      gender: p.gender
    }), /*#__PURE__*/React.createElement(LevelBadge, {
      level: p.level
    }), /*#__PURE__*/React.createElement("span", {
      className: "player-name",
      style: {
        color: isBeingReplaced ? 'var(--red)' : undefined
      }
    }, p.name), p.partnerId && section.players.find(x => x.id === p.partnerId) && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        color: '#ce93d8'
      }
    }, "🔗"), isRearranging && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        fontSize: 12,
        color: 'var(--teal)',
        opacity: 0.7
      }
    }, "⠿"), !isRearranging && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 3,
        marginLeft: 'auto',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("button", {
      title: 'Auto-remove ' + p.name + ' and fill from queue (algorithm pick)',
      onClick: e => {
        e.stopPropagation();
        setReplacingPlayer(null);
        autoRemoveAndReplace(court.id, p.id);
      },
      style: {
        background: 'var(--orange-dim)',
        border: '1px solid var(--orange)55',
        borderRadius: 4,
        color: 'var(--orange)',
        fontSize: 10,
        fontWeight: 900,
        cursor: queue.length === 0 ? 'not-allowed' : 'pointer',
        padding: '2px 6px',
        lineHeight: 1.4,
        flexShrink: 0,
        opacity: queue.length === 0 ? 0.3 : 1,
        transition: 'all 0.15s'
      },
      disabled: queue.length === 0
    }, "⚡"), courts.filter(c => c.enabled && c.players).length > 1 && /*#__PURE__*/React.createElement("button", {
      title: isSwapSource ? 'Cancel cross-court swap' : 'Swap ' + p.name + ' with a player on another court',
      onClick: e => {
        e.stopPropagation();
        if (isSwapSource) {
          setCrossCourtSwap(null);
        } else {
          setReplacingPlayer(null);
          setRearrangeCourt(null);
          setCrossCourtSwap({
            courtId: court.id,
            playerId: p.id
          });
        }
      },
      style: {
        background: isSwapSource ? '#ab47bc' : 'transparent',
        border: '1px solid ' + (isSwapSource ? '#ab47bc' : '#ab47bc55'),
        borderRadius: 4,
        color: isSwapSource ? '#fff' : '#ab47bc',
        fontSize: 11,
        fontWeight: 800,
        cursor: 'pointer',
        padding: '2px 5px',
        lineHeight: 1.4,
        flexShrink: 0,
        transition: 'all 0.15s'
      }
    }, "⇄"), /*#__PURE__*/React.createElement("button", {
      title: 'Manually choose sub for ' + p.name,
      onClick: e => {
        e.stopPropagation();
        setReplacingPlayer(replacingPlayer?.playerId === p.id ? null : {
          courtId: court.id,
          playerId: p.id
        });
        setRearrangeCourt(null);
      },
      style: {
        background: isBeingReplaced ? 'var(--red)' : 'transparent',
        border: '1px solid ' + (isBeingReplaced ? 'var(--red)' : 'var(--border)'),
        borderRadius: 4,
        color: isBeingReplaced ? '#fff' : 'var(--red)',
        fontSize: 11,
        fontWeight: 800,
        cursor: 'pointer',
        padding: '2px 5px',
        lineHeight: 1.4,
        flexShrink: 0,
        transition: 'all 0.15s'
      }
    }, "✕"))), isBeingReplaced && (() => {
      // Restrict substitution candidates to whoever the current mode allows:
      // OP Multi Group requires the sub share the outgoing player's group;
      // OP Meet requires the sub share their teammate's team.
      const teammate = section.players.find(x => x.id !== p.id);
      const subCandidates = queue.filter(qp => {
        if (matchMode === 'OP Multi Group') return !teammate?.group || qp.group === teammate.group;
        if (matchMode === 'OP Meet') return !teammate?.team || qp.team === teammate.team;
        return true;
      });
      return /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--surface)',
        border: '1px solid var(--red)',
        borderRadius: 8,
        padding: '10px',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--red)',
        marginBottom: 2
      }
    }, "Manually sub out ", /*#__PURE__*/React.createElement("strong", null, p.name), ":"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: 'var(--text-dim)',
        marginBottom: 8
      }
    }, "Tip: use ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--orange)',
        fontWeight: 900
      }
    }, "⚡"), " for smart auto-fill from queue"), subCandidates.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--text-dim)',
        textAlign: 'center',
        padding: '8px 0'
      }
    }, matchMode === 'OP Multi Group' ? `No queued players in "${playGroups.find(g => g.id === teammate?.group)?.name || 'this group'}"` : matchMode === 'OP Meet' ? `No queued players on "${teams.find(t => t.id === teammate?.team)?.name || 'this team'}"` : "No players in queue") : /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        maxHeight: 160,
        overflowY: 'auto'
      }
    }, subCandidates.map(qp => /*#__PURE__*/React.createElement("div", {
      key: qp.id,
      onClick: () => replaceCourtPlayer(court.id, p.id, qp),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 8px',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: 'var(--surface2)',
        cursor: 'pointer',
        fontSize: 12,
        transition: 'all 0.15s'
      },
      onMouseOver: e => {
        e.currentTarget.style.borderColor = 'var(--green)';
        e.currentTarget.style.background = 'var(--green-dim)';
      },
      onMouseOut: e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'var(--surface2)';
      }
    }, /*#__PURE__*/React.createElement(GenderTag, {
      gender: qp.gender
    }), /*#__PURE__*/React.createElement(LevelBadge, {
      level: qp.level
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        flex: 1
      }
    }, qp.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'var(--text-muted)'
      }
    }, "🎮 ", playerStats[qp.id]?.games || 0, "g")))), /*#__PURE__*/React.createElement("button", {
      onClick: () => setReplacingPlayer(null),
      style: {
        marginTop: 8,
        width: '100%',
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 6,
        color: 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 600,
        padding: '5px',
        cursor: 'pointer'
      }
    }, "Cancel"));
    })());
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'var(--text-dim)',
      marginBottom: 4,
      textAlign: 'right',
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--orange)',
      fontWeight: 900
    }
  }, "⚡"), ' ', "auto-fill \xA0·\xA0 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#ab47bc',
      fontWeight: 800
    }
  }, "⇄"), ' ', "cross-court swap \xA0·\xA0 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--red)',
      fontWeight: 700
    }
  }, "✕"), ' ', "manual sub"), /*#__PURE__*/React.createElement("div", {
    className: "court-action-row"
  }, rearrangeCourt !== court.id && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => {
      setRearrangeCourt(court.id);
      setDragPlayerId(null);
      setReplacingPlayer(null);
    },
    title: "Rearrange players by dragging"
  }, "⇅ Rearrange"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-red btn-sm",
    style: {
      flex: 1
    },
    onClick: () => {
      setRearrangeCourt(null);
      endGame(court.id);
    }
  }, "End & Score")), rearrangeCourt !== court.id && courts.filter(c => c.enabled).length > 1 && /*#__PURE__*/React.createElement("select", {
    value: "",
    title: "Move this game to another court",
    onChange: e => {
      const targetId = parseInt(e.target.value, 10);
      if (targetId) moveGameToCourt(court.id, targetId);
      e.target.value = "";
    },
    style: {
      width: '100%',
      marginTop: 6,
      cursor: 'pointer',
      background: 'var(--surface3)',
      color: 'var(--text-muted)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      padding: '5px 10px',
      fontSize: 11,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "⇄ Move to another court…"), courts.filter(c => c.id !== court.id && c.enabled).map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.players ? `Swap with Court ${c.id}` : `Move to Court ${c.id}`)))) : /*#__PURE__*/React.createElement(React.Fragment, null, [0, 1, 2, 3].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "player-slot empty"
  }, "open slot")), matchMode === 'Manual' && queue.length >= 4 && (manualCourt === court.id ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-muted)',
      marginBottom: 6
    }
  }, "Pick 4 players (", manualSelected.length, "/4) — first 2 = Team A, last 2 = Team B"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 8,
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: 12,
      color: 'var(--text-dim)',
      pointerEvents: 'none'
    }
  }, "🔍"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Search player…",
    value: manualSearch,
    onChange: e => setManualSearch(e.target.value),
    style: {
      paddingLeft: 28,
      fontSize: 12,
      background: 'var(--surface3)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      color: 'var(--text-main)',
      width: '100%'
    }
  }), manualSearch && /*#__PURE__*/React.createElement("button", {
    onClick: () => setManualSearch(''),
    style: {
      position: 'absolute',
      right: 6,
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: 'var(--text-dim)',
      cursor: 'pointer',
      fontSize: 13,
      lineHeight: 1,
      padding: 0
    }
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "player-select-grid"
  }, queue.filter(p => !manualSearch.trim() || p.name.toLowerCase().includes(manualSearch.trim().toLowerCase())).map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: `player-select-item ${manualSelected.find(x => x.id === p.id) ? 'selected' : ''}`,
    onClick: () => toggleManualPlayer(p)
  }, /*#__PURE__*/React.createElement(GenderTag, {
    gender: p.gender
  }), /*#__PURE__*/React.createElement(LevelBadge, {
    level: p.level
  }), " ", p.name)), queue.filter(p => !manualSearch.trim() || p.name.toLowerCase().includes(manualSearch.trim().toLowerCase())).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1/-1',
      fontSize: 11,
      color: 'var(--text-dim)',
      textAlign: 'center',
      padding: 8
    }
  }, "No players match \"", manualSearch, "\"")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-green btn-sm",
    style: {
      flex: 1
    },
    onClick: confirmManual
  }, "Start Game"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => {
      setManualCourt(null);
      setManualSearch('');
    }
  }, "Cancel"))) : /*#__PURE__*/React.createElement("button", {
    className: "btn btn-blue btn-sm",
    style: {
      width: '100%',
      marginTop: 8
    },
    onClick: () => startManual(court.id)
  }, "Assign Manually")), matchMode !== 'Manual' && queue.length >= 4 && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    style: {
      width: '100%',
      marginTop: 8
    },
    onClick: () => autoAssign(court.id)
  }, "▶ Start Game"), queue.length < 4 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-dim)',
      textAlign: 'center',
      marginTop: 8
    }
  }, "Need 4+ in queue"))))), showUpNext && activeTab === 'courts' && queue.length >= 4 && matchMode !== 'Manual' && (() => {
    // Simulate the next 2 auto-assign picks without touching real state.
    // Must mirror autoAssign exactly: same forceMixed counter logic and
    // same priorityIds (readyToFire requested game) check.
    const previewMatches = [];
    // Cap preview queue to first 20 players — avoids O(n⁴) hang with large rosters.
    // The actual autoAssign uses the full queue, so this only affects the preview display.
    let simQueue = queue.slice(0, 20);
    let simAssignCount = assignCount.current;
    let simSbMixedCount = sbMixedCount.current;
    for (let n = 0; n < 2; n++) {
      if (simQueue.length < 4) break;
      simAssignCount += 1;
      let forceMixed = false;
      if (matchMode === 'Skill Based' || matchMode === 'Same Level') {
        forceMixed = simAssignCount % 3 === 0;
      }
      if (matchMode === 'Skill Based') {
        simSbMixedCount += 1;
        forceMixed = simSbMixedCount % 3 === 0;
      }
      // Check for a readyToFire requested game at the front of the simulated queue
      let simPriorityIds = null;
      for (const req of requestedGames) {
        if (!req.readyToFire) continue;
        const positions = req.playerIds.map(id => simQueue.findIndex(p => p.id === id));
        if (positions.some(pos => pos === -1)) continue;
        const maxPos = Math.max(...positions);
        const othersAhead = simQueue.slice(0, maxPos).filter(p => !req.playerIds.includes(p.id)).length;
        if (othersAhead === 0) {
          simPriorityIds = req.playerIds;
          break;
        }
      }
      const m = findMatch(simQueue, matchMode, forceMixed, simPriorityIds);
      if (!m) break;
      previewMatches.push(m);
      simQueue = simQueue.filter(p => !m.ids.includes(p.id));
    }
    if (!previewMatches.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: 'var(--text-dim)',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'var(--text-dim)',
        display: 'inline-block'
      }
    }), "Up Next — Queue Preview"), /*#__PURE__*/React.createElement("div", {
      className: "courts-grid"
    }, previewMatches.map((m, idx) => {
      const fCount = [...m.teamA, ...m.teamB].filter(p => p.gender === 'F').length;
      const matchLabel = matchMode === 'Open Level' ? '⚡ Open Levels' : matchMode === 'OP Multi Group' ? '🏟 Multi Group' : matchMode === 'OP Meet' ? '🤝 Team Meet' : fCount === 2 ? '♀♂ Mixed Doubles' : fCount === 4 ? "♀ Women's Doubles" : "♂ Men's Doubles";
      return /*#__PURE__*/React.createElement("div", {
        key: idx,
        className: "court-card",
        style: {
          borderColor: 'var(--text-dim)',
          borderStyle: 'dashed',
          opacity: 0.75,
          position: 'relative',
          overflow: 'hidden'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          top: 0,
          right: 0,
          background: 'var(--surface3)',
          borderBottomLeftRadius: 6,
          padding: '2px 7px',
          fontSize: 9,
          fontWeight: 800,
          color: 'var(--text-dim)',
          letterSpacing: 1,
          textTransform: 'uppercase'
        }
      }, "Up Next ", idx + 1), /*#__PURE__*/React.createElement("div", {
        className: "court-header"
      }, /*#__PURE__*/React.createElement("span", {
        className: "court-name",
        style: {
          color: 'var(--text-muted)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "court-status-dot dot-gray"
      }), "Next Game ", idx + 1), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 9,
          fontWeight: 800,
          color: 'var(--text-dim)',
          letterSpacing: .5,
          textTransform: 'uppercase'
        }
      }, matchLabel)), [{
        label: '— TEAM A —',
        players: m.teamA
      }, null, {
        label: '— TEAM B —',
        players: m.teamB
      }].map((section, si) => section === null ? /*#__PURE__*/React.createElement("div", {
        key: "vs",
        className: "team-divider",
        style: {
          color: 'var(--text-dim)'
        }
      }, "— VS —") : /*#__PURE__*/React.createElement(React.Fragment, {
        key: section.label
      }, /*#__PURE__*/React.createElement("div", {
        className: "team-divider",
        style: {
          color: 'var(--text-dim)'
        }
      }, section.label), section.players.map(p => {
        const partner = section.players.find(x => x.id !== p.id);
        const partnerRep = partner ? partnerGet(p.id, partner.id) : 0;
        return /*#__PURE__*/React.createElement("div", {
          key: p.id,
          className: "player-slot",
          style: {
            opacity: 0.85,
            background: 'var(--surface2)'
          }
        }, /*#__PURE__*/React.createElement(GenderTag, {
          gender: p.gender
        }), /*#__PURE__*/React.createElement(LevelBadge, {
          level: p.level
        }), /*#__PURE__*/React.createElement("span", {
          className: "player-name",
          style: {
            color: 'var(--text-muted)'
          }
        }, p.name), partnerRep > 0 ? /*#__PURE__*/React.createElement("span", {
          title: `Played together ${partnerRep}× before`,
          style: {
            fontSize: 9,
            color: 'var(--orange)',
            fontWeight: 800,
            marginLeft: 'auto'
          }
        }, "🔁×", partnerRep) : /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 9,
            color: 'var(--green)',
            fontWeight: 800,
            marginLeft: 'auto'
          }
        }, "✦ new"));
      }))), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: 'var(--text-dim)',
          textAlign: 'center',
          marginTop: 8,
          fontStyle: 'italic'
        }
      }, "preview · subject to change"));
    })));
  })(), activeTab === 'queue' && /*#__PURE__*/React.createElement("div", {
    className: "two-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title",
    style: {
      marginBottom: 0
    }
  }, "Waitlist — ", queue.length, " players")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 9,
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: 13,
      color: 'var(--text-dim)',
      pointerEvents: 'none'
    }
  }, "🔍"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Search player…",
    value: waitlistSearch,
    onChange: e => setWaitlistSearch(e.target.value),
    style: {
      paddingLeft: 30,
      background: 'var(--surface3)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 12,
      color: 'var(--text-main)',
      width: '100%'
    }
  }), waitlistSearch && /*#__PURE__*/React.createElement("button", {
    onClick: () => setWaitlistSearch(''),
    style: {
      position: 'absolute',
      right: 8,
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: 'var(--text-dim)',
      cursor: 'pointer',
      fontSize: 14,
      lineHeight: 1,
      padding: 0
    }
  }, "✕")), matchMode === 'OP Multi Group' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setWaitlistGroupFilter(null),
    style: {
      padding: '4px 10px',
      borderRadius: 20,
      border: `1px solid ${!waitlistGroupFilter ? 'var(--teal)' : 'var(--border)'}`,
      background: !waitlistGroupFilter ? 'var(--teal-dim, rgba(0,150,150,0.15))' : 'transparent',
      color: !waitlistGroupFilter ? 'var(--teal)' : 'var(--text-muted)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "All (", queue.length, ")"), playGroups.map(g => {
    const count = queue.filter(p => p.group === g.id).length;
    return /*#__PURE__*/React.createElement("button", {
      key: g.id,
      onClick: () => setWaitlistGroupFilter(g.id),
      style: {
        padding: '4px 10px',
        borderRadius: 20,
        border: `1px solid ${waitlistGroupFilter === g.id ? 'var(--teal)' : 'var(--border)'}`,
        background: waitlistGroupFilter === g.id ? 'var(--teal-dim, rgba(0,150,150,0.15))' : 'transparent',
        color: waitlistGroupFilter === g.id ? 'var(--teal)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, "🏟 ", g.name, " (", count, ")");
  }), (() => {
    const unassignedCount = queue.filter(p => !p.group).length;
    if (!unassignedCount) return null;
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => setWaitlistGroupFilter('__unassigned__'),
      style: {
        padding: '4px 10px',
        borderRadius: 20,
        border: `1px solid ${waitlistGroupFilter === '__unassigned__' ? 'var(--red)' : 'var(--border)'}`,
        background: waitlistGroupFilter === '__unassigned__' ? 'rgba(255,0,0,0.1)' : 'transparent',
        color: waitlistGroupFilter === '__unassigned__' ? 'var(--red)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, "No Group (", unassignedCount, ")");
  })()), matchMode === 'OP Meet' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setWaitlistTeamFilter(null),
    style: {
      padding: '4px 10px',
      borderRadius: 20,
      border: `1px solid ${!waitlistTeamFilter ? 'var(--purple, #9c27b0)' : 'var(--border)'}`,
      background: !waitlistTeamFilter ? 'rgba(156,39,176,0.15)' : 'transparent',
      color: !waitlistTeamFilter ? 'var(--purple, #9c27b0)' : 'var(--text-muted)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "All (", queue.length, ")"), teams.map(t => {
    const count = queue.filter(p => p.team === t.id).length;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setWaitlistTeamFilter(t.id),
      style: {
        padding: '4px 10px',
        borderRadius: 20,
        border: `1px solid ${waitlistTeamFilter === t.id ? 'var(--purple, #9c27b0)' : 'var(--border)'}`,
        background: waitlistTeamFilter === t.id ? 'rgba(156,39,176,0.15)' : 'transparent',
        color: waitlistTeamFilter === t.id ? 'var(--purple, #9c27b0)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, "🤝 ", t.name, " (", count, ")");
  }), (() => {
    const unassignedCount = queue.filter(p => !p.team).length;
    if (!unassignedCount) return null;
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => setWaitlistTeamFilter('__unassigned__'),
      style: {
        padding: '4px 10px',
        borderRadius: 20,
        border: `1px solid ${waitlistTeamFilter === '__unassigned__' ? 'var(--red)' : 'var(--border)'}`,
        background: waitlistTeamFilter === '__unassigned__' ? 'rgba(255,0,0,0.1)' : 'transparent',
        color: waitlistTeamFilter === '__unassigned__' ? 'var(--red)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, "No Team (", unassignedCount, ")");
  })()), queue.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, "No players in queue. Add some below!") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-muted)',
      marginBottom: 8,
      lineHeight: 1.5
    }
  }, "Listed in registration order — earliest arrivals get priority.", matchMode === 'Skill Based' && ' Skill Based: adjacent levels, mixed gender every 3rd game.', matchMode === 'Open Level' && ' Open Level: all skill levels, balanced teams.', matchMode === 'OP Multi Group' && ' OP Multi Group: players only match within their assigned group.', matchMode === 'OP Meet' && ' OP Meet: partners share a team, opponents come from a different team.'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-dim)',
      marginBottom: 8,
      lineHeight: 1.5
    },
    title: "Estimated from players waiting, active courts, and the time limit"
  }, "Average wait time: ", activePlayers > 0 ? (queue.length > 0 ? `${avgWaitMinutes}min      Estimated ${minWaitMinutes}-${maxWaitMinutes}min` : 'No wait — courts available') : 'No active courts'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      flexWrap: 'wrap',
      marginBottom: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--text-dim)',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: .5,
      marginRight: 2
    }
  }, "Sort:"), [{
    col: null,
    label: 'Queue Order'
  }, {
    col: 'name',
    label: 'Name'
  }, {
    col: 'level',
    label: 'Level'
  }, {
    col: 'games',
    label: 'Games'
  }].map(({
    col,
    label
  }) => /*#__PURE__*/React.createElement("button", {
    key: label,
    onClick: () => col ? toggleSort(queueSort, setQueueSort, col) : setQueueSort({
      col: null,
      dir: 'asc'
    }),
    style: {
      padding: '3px 10px',
      borderRadius: 20,
      border: `1px solid ${!col && !queueSort.col || queueSort.col === col ? 'var(--blue)' : 'var(--border)'}`,
      background: !col && !queueSort.col || queueSort.col === col ? 'var(--blue-dim)' : 'transparent',
      color: !col && !queueSort.col || queueSort.col === col ? 'var(--blue)' : 'var(--text-muted)',
      fontSize: 11,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, label, col && queueSort.col === col && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 3,
      fontSize: 9
    }
  }, queueSort.dir === 'asc' ? '▲' : '▼')))), /*#__PURE__*/React.createElement("div", {
    className: "queue-list"
  }, (() => {
    let filtered = queue.filter(p => !waitlistSearch.trim() || p.name.toLowerCase().includes(waitlistSearch.trim().toLowerCase()));
    if (matchMode === 'OP Multi Group' && waitlistGroupFilter) {
      filtered = filtered.filter(p => waitlistGroupFilter === '__unassigned__' ? !p.group : p.group === waitlistGroupFilter);
    }
    if (matchMode === 'OP Meet' && waitlistTeamFilter) {
      filtered = filtered.filter(p => waitlistTeamFilter === '__unassigned__' ? !p.team : p.team === waitlistTeamFilter);
    }
    if (queueSort.col) {
      const dir = queueSort.dir === 'asc' ? 1 : -1;
      filtered = [...filtered].sort((a, b) => {
        if (queueSort.col === 'name') return dir * a.name.localeCompare(b.name);
        if (queueSort.col === 'level') return dir * (LEVEL_IDX[a.level] - LEVEL_IDX[b.level]);
        if (queueSort.col === 'games') return dir * ((playerStats[a.id]?.games || 0) - (playerStats[b.id]?.games || 0));
        return 0;
      });
    }
    if (filtered.length === 0) return /*#__PURE__*/React.createElement("div", {
      className: "empty-state",
      style: {
        padding: '16px',
        fontSize: 12
      }
    }, "No players match \"", waitlistSearch, "\"");
    return filtered.map((p, i) => {
      const partner = p.partnerId ? queue.find(x => x.id === p.partnerId) : null;
      const gamesPlayed = playerStats[p.id]?.games || 0;
      const queuePos = queue.findIndex(x => x.id === p.id) + 1;
      return /*#__PURE__*/React.createElement("div", {
        key: p.id,
        className: "queue-item",
        style: {
          flexWrap: 'nowrap'
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "queue-num"
      }, "#", queuePos), /*#__PURE__*/React.createElement(GenderTag, {
        gender: p.gender
      }), /*#__PURE__*/React.createElement(LevelBadge, {
        level: p.level
      }), /*#__PURE__*/React.createElement("span", {
        className: "queue-name"
      }, p.name), partner && /*#__PURE__*/React.createElement("span", {
        className: "partner-tag",
        title: "Fixed pair",
        style: {
          cursor: 'pointer'
        },
        onClick: () => unlinkPartner(p.id)
      }, "🔗 ", partner.name, " ✕"), partner && p.level !== partner.level && p.level !== 'Open' && partner.level !== 'Open' && /*#__PURE__*/React.createElement("span", {
        title: `${p.level} + ${partner.level} — this pair won't be matched in Same Level mode until their levels match or you switch modes`,
        style: {
          fontSize: 13,
          cursor: 'help'
        }
      }, "⚠️"), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          color: 'var(--text-muted)',
          marginLeft: 'auto',
          marginRight: 4,
          whiteSpace: 'nowrap'
        }
      }, "🎮 ", gamesPlayed, "g"), gamesPlayed > 0 && /*#__PURE__*/React.createElement(WaitTimer, {
        key: "wait-" + p.id,
        since: p.queuedAt || sessionStartedMs
      }), /*#__PURE__*/React.createElement(React.Fragment, null, !partner && /*#__PURE__*/React.createElement("button", {
        className: "btn btn-ghost btn-sm",
        title: "Link fixed partner",
        style: {
          color: '#ce93d8',
          borderColor: '#9c27b055'
        },
        onClick: () => {
          setPairModal({
            playerId: p.id
          });
          setPairTarget(null);
        }
      }, "🔗"), /*#__PURE__*/React.createElement("button", {
        className: "btn btn-ghost btn-sm",
        onClick: () => removeFromQueue(p.id)
      }, "✕")));
    });
  })()))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Add Player"), /*#__PURE__*/React.createElement("div", {
    className: "add-player-form"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: `mode-btn ${!addingPair ? 'active' : ''}`,
    onClick: () => setAddingPair(false),
    style: {
      flex: 1,
      borderRadius: 6
    }
  }, "Solo Player"), /*#__PURE__*/React.createElement("button", {
    className: `mode-btn ${addingPair ? 'active' : ''}`,
    style: {
      flex: 1,
      background: addingPair ? 'var(--purple)' : 'transparent',
      borderColor: addingPair ? 'var(--purple)' : 'var(--border)',
      color: addingPair ? '#fff' : 'var(--text-muted)',
      borderRadius: 6
    },
    onClick: () => setAddingPair(true)
  }, "🔗 Fixed Pair")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface2)',
      borderRadius: 6,
      padding: '8px',
      border: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--text-muted)',
      fontWeight: 700,
      marginBottom: 5,
      textTransform: 'uppercase',
      letterSpacing: .5
    }
  }, addingPair ? 'Player 1' : 'Player'), /*#__PURE__*/React.createElement("input", {
    placeholder: "Name",
    value: newName,
    onChange: e => setNewName(e.target.value),
    onKeyDown: e => e.key === 'Enter' && addPlayer(),
    style: {
      marginBottom: 6
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: newLevel,
    onChange: e => setNewLevel(e.target.value),
    style: {
      marginBottom: 6
    }
  }, LEVELS.map(l => /*#__PURE__*/React.createElement("option", {
    key: l,
    value: l
  }, l))), matchMode === 'OP Multi Group' && /*#__PURE__*/React.createElement("select", {
    value: newGroup,
    onChange: e => setNewGroup(e.target.value),
    style: {
      marginBottom: 6,
      borderColor: !newGroup ? 'var(--red)' : undefined
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select group…"), playGroups.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name))), matchMode === 'OP Meet' && /*#__PURE__*/React.createElement("select", {
    value: newTeam,
    onChange: e => setNewTeam(e.target.value),
    style: {
      marginBottom: 6,
      borderColor: !newTeam ? 'var(--red)' : undefined
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select team…"), teams.map(t => /*#__PURE__*/React.createElement("option", {
    key: t.id,
    value: t.id
  }, t.name))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setNewGender('M'),
    style: {
      flex: 1,
      padding: '6px',
      borderRadius: 6,
      border: `1px solid ${newGender === 'M' ? 'var(--blue)' : 'var(--border)'}`,
      background: newGender === 'M' ? 'var(--blue-dim)' : 'transparent',
      color: newGender === 'M' ? 'var(--blue)' : 'var(--text-muted)',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "♂ Male"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setNewGender('F'),
    style: {
      flex: 1,
      padding: '6px',
      borderRadius: 6,
      border: `1px solid ${newGender === 'F' ? '#e91e63' : 'var(--border)'}`,
      background: newGender === 'F' ? '#2a0818' : 'transparent',
      color: newGender === 'F' ? '#f06292' : 'var(--text-muted)',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "♀ Female"))), addingPair && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--purple-dim)',
      borderRadius: 6,
      padding: '8px',
      border: '1px solid #9c27b055'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#ce93d8',
      fontWeight: 700,
      marginBottom: 5,
      textTransform: 'uppercase',
      letterSpacing: .5
    }
  }, "🔗 Partner (Player 2)"), /*#__PURE__*/React.createElement("input", {
    placeholder: "Partner name",
    value: newPartnerName,
    onChange: e => setNewPartnerName(e.target.value),
    onKeyDown: e => e.key === 'Enter' && addPlayer(),
    style: {
      marginBottom: 6,
      borderColor: '#9c27b055'
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: newPartnerLevel,
    onChange: e => setNewPartnerLevel(e.target.value),
    style: {
      borderColor: '#9c27b055',
      marginBottom: 6
    }
  }, LEVELS.map(l => /*#__PURE__*/React.createElement("option", {
    key: l,
    value: l
  }, l))), matchMode === 'OP Multi Group' && /*#__PURE__*/React.createElement("select", {
    value: newPartnerGroup,
    onChange: e => setNewPartnerGroup(e.target.value),
    style: {
      borderColor: !newPartnerGroup ? 'var(--red)' : '#9c27b055',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select group…"), playGroups.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name))), matchMode === 'OP Meet' && /*#__PURE__*/React.createElement("select", {
    value: newPartnerTeam,
    onChange: e => setNewPartnerTeam(e.target.value),
    style: {
      borderColor: !newPartnerTeam ? 'var(--red)' : '#9c27b055',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select team…"), teams.map(t => /*#__PURE__*/React.createElement("option", {
    key: t.id,
    value: t.id
  }, t.name))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setNewPartnerGender('M'),
    style: {
      flex: 1,
      padding: '6px',
      borderRadius: 6,
      border: `1px solid ${newPartnerGender === 'M' ? 'var(--blue)' : '#9c27b044'}`,
      background: newPartnerGender === 'M' ? 'var(--blue-dim)' : 'transparent',
      color: newPartnerGender === 'M' ? 'var(--blue)' : 'var(--text-muted)',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "♂ Male"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setNewPartnerGender('F'),
    style: {
      flex: 1,
      padding: '6px',
      borderRadius: 6,
      border: `1px solid ${newPartnerGender === 'F' ? '#e91e63' : '#9c27b044'}`,
      background: newPartnerGender === 'F' ? '#2a0818' : 'transparent',
      color: newPartnerGender === 'F' ? '#f06292' : 'var(--text-muted)',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "♀ Female")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#ce93d8',
      lineHeight: 1.5
    }
  }, "Fixed partners will always be placed on the same team.")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-green",
    onClick: addPlayer
  }, addingPair ? '🔗 Add Fixed Pair' : 'Add to Queue'))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Skill Level Guide"), /*#__PURE__*/React.createElement("div", {
    className: "level-legend"
  }, LEVELS.map(l => /*#__PURE__*/React.createElement("span", {
    key: l
  }, /*#__PURE__*/React.createElement(LevelBadge, {
    level: l
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontSize: 12,
      color: 'var(--text-muted)',
      lineHeight: 1.8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: '#aaffaa'
    }
  }, "Open"), " — All welcome, used in Open Level mode"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--green)'
    }
  }, "Beginner"), " — Just learning"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--blue)'
    }
  }, "Low-Int"), " — Know basics, working on consistency"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--teal)'
    }
  }, "Intermediate"), " — Consistent rallies, developing strategy"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--orange)'
    }
  }, "High-Int"), " — Solid fundamentals, strategic play"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: '#ce93d8'
    }
  }, "Advanced"), " — Competitive, tournament-ready"))))), activeTab === 'playerlist' && /*#__PURE__*/React.createElement(PlayerListTab, {
    playerList: playerList,
    setPlayerList: setPlayerList,
    playerListSearch: playerListSearch,
    setPlayerListSearch: setPlayerListSearch,
    queue: queue,
    setQueue: setQueue,
    courts: courts,
    showNotif: showNotif,
    exportPlayerListXLSX: exportPlayerListXLSX,
    importPlayerListXLSX: importPlayerListXLSX,
    addingPair: addingPair,
    setAddingPair: setAddingPair,
    newName: newName,
    setNewName: setNewName,
    newLevel: newLevel,
    setNewLevel: setNewLevel,
    newGender: newGender,
    setNewGender: setNewGender,
    newPartnerName: newPartnerName,
    setNewPartnerName: setNewPartnerName,
    newPartnerLevel: newPartnerLevel,
    setNewPartnerLevel: setNewPartnerLevel,
    newPartnerGender: newPartnerGender,
    setNewPartnerGender: setNewPartnerGender,
    matchMode: matchMode,
    playGroups: playGroups,
    newGroup: newGroup,
    setNewGroup: setNewGroup,
    newPartnerGroup: newPartnerGroup,
    setNewPartnerGroup: setNewPartnerGroup,
    teams: teams,
    newTeam: newTeam,
    setNewTeam: setNewTeam,
    newPartnerTeam: newPartnerTeam,
    setNewPartnerTeam: setNewPartnerTeam,
    addPlayer: addPlayer,
    onJoin: id => {
      if (joinRoundRef.current[id] === undefined) joinRoundRef.current[id] = roundsFiredRef.current;
    }
  }), activeTab === 'requests' && /*#__PURE__*/React.createElement("div", {
    className: "two-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Requested Games Queue"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-muted)',
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, "Once all other players have had their turn, the 4 players stay in queue at their natural position. Auto Assign will group them together when they reach the front — no one gets skipped. Use ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--orange)'
    }
  }, "🎯 Start This Game"), " to fire it manually anytime all 4 are free."), requestedGames.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, "No requested games. Add one using the panel →") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, requestedGames.map((req, idx) => {
    const allSessionPlayers = [...queue, ...courts.flatMap(c => c.players ? [...c.players.teamA, ...c.players.teamB] : [])];
    const players = req.playerIds.map(id => {
      const p = allSessionPlayers.find(x => x.id === id);
      const onCourt = p && courts.some(c => c.players && [...c.players.teamA, ...c.players.teamB].find(x => x.id === id));
      const baseline = req.baselineCounts?.[id] ?? 0;
      const currentGames = playerStats[id]?.games || 0;
      const roundedUp = currentGames > baseline;
      return p ? {
        ...p,
        onCourt,
        roundedUp
      } : null;
    });
    const allFound = players.every(Boolean);
    const allFree = allFound && players.every(p => !p.onCourt);
    const allRoundedUp = allFound && players.every(p => p.roundedUp);
    const someOnCourt = players.some(p => p && p.onCourt);
    const hasOpenCourt = courts.some(c => c.enabled && !c.players);
    const canStart = allFree && hasOpenCourt;
    const isReadyToFire = !!req.readyToFire;
    // Count others in queue ahead of these 4
    const positions = req.playerIds.map(id => queue.findIndex(p => p.id === id));
    const allInQueue = positions.every(pos => pos !== -1);
    const maxPos = allInQueue ? Math.max(...positions) : -1;
    const othersAhead = allInQueue ? queue.slice(0, maxPos).filter(p => !req.playerIds.includes(p.id)).length : null;
    const atFront = allInQueue && othersAhead === 0;
    return /*#__PURE__*/React.createElement("div", {
      key: req.id,
      className: "req-item",
      style: {
        flexWrap: 'wrap',
        gap: 8,
        borderColor: isReadyToFire && atFront ? 'var(--green)' : isReadyToFire ? 'var(--orange)' : someOnCourt ? 'var(--blue)' : 'var(--border)',
        opacity: allFound ? 1 : 0.55
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "req-badge"
    }, "#", idx + 1), !allFound && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'var(--red)',
        fontWeight: 700
      }
    }, "⚠ Player left session"), allFound && isReadyToFire && atFront && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'var(--green)',
        fontWeight: 700
      }
    }, "⚡ At front of queue — fires on next Auto Assign!"), allFound && isReadyToFire && !atFront && allFree && othersAhead !== null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'var(--orange)',
        fontWeight: 700
      }
    }, "✓ Round done — ", othersAhead, " player", othersAhead !== 1 ? 's' : '', " ahead in queue"), allFound && isReadyToFire && !allFree && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'var(--blue)',
        fontWeight: 700
      }
    }, "✓ Round done — some still on court"), allFound && !isReadyToFire && someOnCourt && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'var(--blue)',
        fontWeight: 700
      }
    }, "🏓 Waiting for round to finish"), allFound && !isReadyToFire && !someOnCourt && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'var(--text-muted)',
        fontWeight: 700
      }
    }, "⏳ Waiting for all other players to play a round"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost btn-sm",
      style: {
        color: 'var(--red)',
        borderColor: 'var(--red-dim)',
        marginLeft: 'auto'
      },
      onClick: () => removeRequestedGame(req.id)
    }, "✕")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 5,
        width: '100%'
      }
    }, players.map((p, i) => p ? /*#__PURE__*/React.createElement("span", {
      key: req.playerIds[i],
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: p.roundedUp ? 'var(--green-dim)' : p.onCourt ? 'var(--blue-dim)' : 'var(--surface3)',
        border: `1px solid ${p.roundedUp ? 'var(--green)44' : p.onCourt ? 'var(--blue)44' : 'transparent'}`,
        borderRadius: 6,
        padding: '3px 8px',
        fontSize: 12,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement(GenderTag, {
      gender: p.gender
    }), /*#__PURE__*/React.createElement(LevelBadge, {
      level: p.level
    }), p.name, p.onCourt && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        color: 'var(--blue)',
        fontWeight: 800,
        marginLeft: 2
      }
    }, "🏓"), p.roundedUp && !p.onCourt && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        color: 'var(--green)',
        fontWeight: 800,
        marginLeft: 2
      }
    }, "✓")) : /*#__PURE__*/React.createElement("span", {
      key: req.playerIds[i],
      style: {
        fontSize: 11,
        color: 'var(--red)',
        background: 'var(--red-dim)',
        borderRadius: 6,
        padding: '3px 8px'
      }
    }, "Left session"))), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-sm",
      style: {
        width: '100%',
        background: canStart ? 'var(--orange)' : 'var(--surface3)',
        color: canStart ? '#000' : 'var(--text-dim)',
        border: `1px solid ${canStart ? 'var(--orange)' : 'var(--border)'}`,
        opacity: canStart ? 1 : 0.5,
        cursor: canStart ? 'pointer' : 'not-allowed'
      },
      disabled: !canStart,
      onClick: () => startRequestedGame(req)
    }, "🎯 Start This Game"));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Add Requested Game"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-muted)',
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, "Select exactly 4 players — queue or currently on court. The game fires when all 4 are free."), (() => {
    // All players in the session: queue + on-court
    const allSessionPlayers = [...queue, ...courts.flatMap(c => c.players ? [...c.players.teamA, ...c.players.teamB] : [])];
    // Deduplicate by id (shouldn't duplicate but safety)
    const seen = new Set();
    const playerPool = allSessionPlayers.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: reqSelected.length === 4 ? 'var(--green)' : 'var(--text-muted)',
        fontWeight: 700,
        marginBottom: 6
      }
    }, reqSelected.length, "/4 players selected"), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: 8,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 13,
        color: 'var(--text-dim)',
        pointerEvents: 'none'
      }
    }, "🔍"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: "Search player…",
      value: reqSearch,
      onChange: e => setReqSearch(e.target.value),
      style: {
        paddingLeft: 30,
        fontSize: 12,
        background: 'var(--surface3)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        color: 'var(--text-main)',
        width: '100%'
      }
    }), reqSearch && /*#__PURE__*/React.createElement("button", {
      onClick: () => setReqSearch(''),
      style: {
        position: 'absolute',
        right: 6,
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        color: 'var(--text-dim)',
        cursor: 'pointer',
        fontSize: 13,
        lineHeight: 1,
        padding: 0
      }
    }, "✕")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        maxHeight: 260,
        overflowY: 'auto',
        marginBottom: 10
      }
    }, playerPool.length === 0 ? /*#__PURE__*/React.createElement("div", {
      className: "empty-state",
      style: {
        padding: 12,
        fontSize: 12
      }
    }, "No players in session") : (() => {
      const filtered = playerPool.filter(p => !reqSearch.trim() || p.name.toLowerCase().includes(reqSearch.trim().toLowerCase()));
      if (filtered.length === 0) return /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: 'var(--text-dim)',
          textAlign: 'center',
          padding: 12
        }
      }, "No players match \"", reqSearch, "\"");
      return filtered.map(p => {
        const sel = reqSelected.includes(p.id);
        const onCourt = courts.some(c => c.players && [...c.players.teamA, ...c.players.teamB].find(x => x.id === p.id));
        return /*#__PURE__*/React.createElement("div", {
          key: p.id,
          className: `pair-select-item ${sel ? 'selected' : ''}`,
          style: {
            borderColor: sel ? 'var(--orange)' : onCourt ? 'var(--blue)44' : 'var(--border)',
            background: sel ? 'var(--orange-dim)' : onCourt ? 'var(--blue-dim)' : 'transparent',
            color: sel ? 'var(--orange)' : 'var(--text-main)'
          },
          onClick: () => {
            if (sel) setReqSelected(prev => prev.filter(id => id !== p.id));else if (reqSelected.length < 4) setReqSelected(prev => [...prev, p.id]);
          }
        }, /*#__PURE__*/React.createElement(GenderTag, {
          gender: p.gender
        }), /*#__PURE__*/React.createElement(LevelBadge, {
          level: p.level
        }), /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 12,
            fontWeight: 600,
            flex: 1
          }
        }, p.name), onCourt && /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 9,
            color: 'var(--blue)',
            fontWeight: 800
          }
        }, "🏓 on court"), sel && /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 11,
            color: 'var(--orange)',
            fontWeight: 800
          }
        }, "✓"));
      });
    })()), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-sm",
      style: {
        flex: 1,
        background: 'var(--orange)',
        color: '#000',
        opacity: reqSelected.length === 4 ? 1 : 0.4
      },
      disabled: reqSelected.length !== 4,
      onClick: () => {
        addRequestedGame(reqSelected);
        setReqSelected([]);
        setReqSearch('');
      }
    }, "🎯 Add Request"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost btn-sm",
      onClick: () => setReqSelected([])
    }, "Clear")));
  })())), simRunning && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 400
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid #7c3aed',
      borderRadius: 14,
      padding: 32,
      width: 340,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      marginBottom: 8
    }
  }, "🧪"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 800,
      color: '#c4b5fd',
      marginBottom: 4
    }
  }, "Simulation Running…"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)',
      marginBottom: 20
    }
  }, "Auto-filling & ending games"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface3)',
      borderRadius: 8,
      height: 16,
      overflow: 'hidden',
      marginBottom: 10,
      border: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      background: 'linear-gradient(90deg,#7c3aed,#a855f7)',
      borderRadius: 8,
      width: `${simTarget > 0 ? Math.min(100, Math.round(simProgress / simTarget * 100)) : 0}%`,
      transition: 'width 0.2s'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      color: '#c4b5fd',
      fontVariantNumeric: 'tabular-nums'
    }
  }, simProgress, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--text-muted)',
      fontWeight: 600
    }
  }, "/ ", simTarget, " games")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-dim)',
      marginTop: 6
    }
  }, simTarget > 0 ? Math.min(100, Math.round(simProgress / simTarget * 100)) : 0, "% complete"))), simModal && /*#__PURE__*/React.createElement("div", {
    className: "session-modal-overlay",
    onClick: () => setSimModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "session-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      marginBottom: 6,
      textAlign: 'center'
    }
  }, "🧪"), /*#__PURE__*/React.createElement("h2", {
    style: {
      textAlign: 'center',
      color: '#c4b5fd'
    }
  }, "Test Simulation"), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center'
    }
  }, "Automatically runs Auto Assign + End Game in a loop, using random scores, until the target number of games is reached. Players cycle back to the queue after each game."), matchMode === 'Manual' && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--red-dim)',
      border: '1px solid var(--red)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      color: '#f88',
      marginBottom: 14,
      textAlign: 'center'
    }
  }, "⚠ Match mode is set to ", /*#__PURE__*/React.createElement("strong", null, "Manual"), " — switch to an Auto mode first."), queue.length < 4 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--orange-dim)',
      border: '1px solid var(--orange)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      color: 'var(--orange)',
      marginBottom: 14,
      textAlign: 'center'
    }
  }, "⚠ Need at least 4 players in the waitlist to simulate."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: .5,
      marginBottom: 6
    }
  }, "Number of games to simulate"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "500",
    value: simGames,
    onChange: e => setSimGames(e.target.value),
    style: {
      fontSize: 28,
      fontWeight: 800,
      textAlign: 'center',
      color: '#c4b5fd',
      background: 'var(--surface2)',
      border: '2px solid #7c3aed',
      borderRadius: 8,
      padding: '10px'
    },
    autoFocus: true,
    onKeyDown: e => {
      if (e.key === 'Enter' && !matchMode === 'Manual' && queue.length >= 4) runSimulation(Math.max(1, Math.min(500, parseInt(simGames) || 1)));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-dim)',
      marginTop: 5,
      textAlign: 'center'
    }
  }, "max 500 per run")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    style: {
      flex: 1,
      background: '#7c3aed',
      color: '#fff',
      fontSize: 14,
      padding: '10px',
      opacity: matchMode === 'Manual' || queue.length < 4 ? 0.4 : 1
    },
    disabled: matchMode === 'Manual' || queue.length < 4,
    onClick: () => runSimulation(Math.max(1, Math.min(500, parseInt(simGames) || 1)))
  }, "▶ Run Simulation"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => setSimModal(false)
  }, "Cancel")))), pairModal && /*#__PURE__*/React.createElement("div", {
    className: "pair-modal-overlay",
    onClick: () => {
      setPairModal(null);
      setPairSearch('');
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pair-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("h2", null, "🔗 Link Fixed Partner"), /*#__PURE__*/React.createElement("p", null, "Select a partner for ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: '#ce93d8'
    }
  }, queue.find(p => p.id === pairModal.playerId)?.name), ". They will always be placed on the same team."), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 8,
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: 13,
      color: 'var(--text-dim)',
      pointerEvents: 'none'
    }
  }, "🔍"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Search player…",
    value: pairSearch,
    onChange: e => setPairSearch(e.target.value),
    style: {
      paddingLeft: 30,
      fontSize: 12,
      background: 'var(--surface3)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      color: 'var(--text-main)',
      width: '100%'
    }
  }), pairSearch && /*#__PURE__*/React.createElement("button", {
    onClick: () => setPairSearch(''),
    style: {
      position: 'absolute',
      right: 6,
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: 'var(--text-dim)',
      cursor: 'pointer',
      fontSize: 13,
      lineHeight: 1,
      padding: 0
    }
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "pair-select-list"
  }, (() => {
    const candidates = queue.filter(p => p.id !== pairModal.playerId && !p.partnerId);
    const filtered = candidates.filter(p => !pairSearch.trim() || p.name.toLowerCase().includes(pairSearch.trim().toLowerCase()));
    if (candidates.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--text-dim)',
        textAlign: 'center',
        padding: 12
      }
    }, "No available players to link");
    if (filtered.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--text-dim)',
        textAlign: 'center',
        padding: 12
      }
    }, "No players match \"", pairSearch, "\"");
    return filtered.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: `pair-select-item ${pairTarget === p.id ? 'selected' : ''}`,
      onClick: () => setPairTarget(pairTarget === p.id ? null : p.id)
    }, /*#__PURE__*/React.createElement(GenderTag, {
      gender: p.gender
    }), /*#__PURE__*/React.createElement(LevelBadge, {
      level: p.level
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontWeight: 600
      }
    }, p.name), pairTarget === p.id && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#ce93d8',
        fontWeight: 800
      }
    }, "✓")));
  })()), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    style: {
      flex: 1,
      background: 'var(--purple)',
      color: '#fff',
      opacity: pairTarget ? 1 : 0.4
    },
    disabled: !pairTarget,
    onClick: () => {
      linkPartners(pairModal.playerId, pairTarget);
      setPairModal(null);
      setPairTarget(null);
      setPairSearch('');
    }
  }, "Link as Fixed Pair"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => {
      setPairModal(null);
      setPairTarget(null);
      setPairSearch('');
    }
  }, "Cancel")))), activeTab === 'history' && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title",
    style: {
      marginBottom: 0
    }
  }, "Game History"), history.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: exportHistoryCSV,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      border: '1px solid var(--green)',
      color: 'var(--green)'
    }
  }, "⬇ Export CSV")), history.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, "No games completed yet. End a game to record the score!") : /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "history-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, [{
    col: 'id',
    label: '#'
  }, {
    col: 'time',
    label: 'Time'
  }, {
    col: 'courtId',
    label: 'Court'
  }, {
    col: null,
    label: 'Team A'
  }, {
    col: 'scoreA',
    label: 'Score'
  }, {
    col: null,
    label: 'Team B'
  }, {
    col: 'winner',
    label: 'Winner'
  }, {
    col: 'duration',
    label: 'Duration'
  }].map(({
    col,
    label
  }) => /*#__PURE__*/React.createElement("th", {
    key: label,
    onClick: col ? () => toggleSort(historySort, setHistorySort, col) : undefined,
    style: {
      cursor: col ? 'pointer' : 'default',
      userSelect: 'none',
      whiteSpace: 'nowrap'
    }
  }, label, col && /*#__PURE__*/React.createElement(SortIcon, {
    sort: historySort,
    col: col
  }))))), /*#__PURE__*/React.createElement("tbody", null, (() => {
    let sorted = [...history];
    if (historySort.col) {
      sorted.sort((a, b) => {
        let av = a[historySort.col],
          bv = b[historySort.col];
        if (historySort.col === 'duration') {
          av = Number(av);
          bv = Number(bv);
        }
        if (historySort.col === 'scoreA') {
          av = Number(av);
          bv = Number(bv);
        }
        if (historySort.col === 'id') {
          av = Number(av);
          bv = Number(bv);
        }
        if (historySort.col === 'courtId') {
          av = Number(av);
          bv = Number(bv);
        }
        if (av < bv) return historySort.dir === 'asc' ? -1 : 1;
        if (av > bv) return historySort.dir === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      sorted.reverse();
    }
    return sorted.map((g, i) => /*#__PURE__*/React.createElement("tr", {
      key: g.id
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        color: 'var(--text-dim)'
      }
    }, history.length - i), /*#__PURE__*/React.createElement("td", {
      style: {
        color: 'var(--text-muted)',
        fontSize: 11
      }
    }, g.time), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("strong", null, "Court ", g.courtId)), /*#__PURE__*/React.createElement("td", null, g.teamA.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement(GenderTag, {
      gender: p.gender
    }), /*#__PURE__*/React.createElement(LevelBadge, {
      level: p.level
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12
      }
    }, p.name)))), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: `score-display ${g.winner === 'A' ? 'win' : g.winner === 'B' ? 'lose' : ''}`
    }, g.scoreA), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-dim)',
        margin: '0 6px'
      }
    }, "–"), /*#__PURE__*/React.createElement("span", {
      className: `score-display ${g.winner === 'B' ? 'win' : g.winner === 'A' ? 'lose' : ''}`
    }, g.scoreB)), /*#__PURE__*/React.createElement("td", null, g.teamB.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement(GenderTag, {
      gender: p.gender
    }), /*#__PURE__*/React.createElement(LevelBadge, {
      level: p.level
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12
      }
    }, p.name)))), /*#__PURE__*/React.createElement("td", null, g.winner === 'tie' ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--gold)',
        fontWeight: 700,
        fontSize: 12
      }
    }, "TIE") : /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--green)',
        fontWeight: 700,
        fontSize: 12
      }
    }, "Team ", g.winner)), /*#__PURE__*/React.createElement("td", {
      style: {
        color: 'var(--text-muted)',
        fontSize: 11
      }
    }, g.duration, "m")));
  })())))), activeTab === 'stats' && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title",
    style: {
      marginBottom: 0
    }
  }, "Player Statistics — ", statsEntries.length, " players"), Object.keys(playerStats).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-gold btn-sm",
    onClick: sendTopPerformerToPreview,
    title: "Show a celebratory Top Performer card on the preview screen",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, "🏆 Top Performer"), matchMode === 'OP Meet' && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: sendTopTeamPerformerToPreview,
    title: "Show a celebratory Top Team Performer card on the preview screen",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      border: '1px solid var(--gold)',
      color: 'var(--gold)'
    }
  }, "🏆 Top Team Performer"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: sendRankListToPreview,
    title: "Show the win-rank leaderboard on the preview screen",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      border: '1px solid var(--blue)',
      color: 'var(--blue)'
    }
  }, "📋 Rank List"), matchMode === 'OP Meet' && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: sendRankListTeamToPreview,
    title: "Show the team win-rank leaderboard on the preview screen",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      border: '1px solid var(--purple, #9c27b0)',
      color: 'var(--purple, #9c27b0)'
    }
  }, "📋 Rank List Team"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: exportStatsCSV,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      border: '1px solid var(--green)',
      color: 'var(--green)'
    }
  }, "⬇ Export CSV"))), matchMode === 'OP Multi Group' && Object.keys(playerStats).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStatsGroupFilter(null),
    style: {
      padding: '4px 10px',
      borderRadius: 20,
      border: `1px solid ${!statsGroupFilter ? 'var(--teal)' : 'var(--border)'}`,
      background: !statsGroupFilter ? 'var(--teal-dim, rgba(0,150,150,0.15))' : 'transparent',
      color: !statsGroupFilter ? 'var(--teal)' : 'var(--text-muted)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "All (", rankedPlayers.length, ")"), playGroups.map(g => {
    const count = rankedPlayers.filter(p => p.group === g.id).length;
    return /*#__PURE__*/React.createElement("button", {
      key: g.id,
      onClick: () => setStatsGroupFilter(g.id),
      style: {
        padding: '4px 10px',
        borderRadius: 20,
        border: `1px solid ${statsGroupFilter === g.id ? 'var(--teal)' : 'var(--border)'}`,
        background: statsGroupFilter === g.id ? 'var(--teal-dim, rgba(0,150,150,0.15))' : 'transparent',
        color: statsGroupFilter === g.id ? 'var(--teal)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, "🏟 ", g.name, " (", count, ")");
  }), (() => {
    const unassignedCount = rankedPlayers.filter(p => !p.group).length;
    if (!unassignedCount) return null;
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => setStatsGroupFilter('__unassigned__'),
      style: {
        padding: '4px 10px',
        borderRadius: 20,
        border: `1px solid ${statsGroupFilter === '__unassigned__' ? 'var(--red)' : 'var(--border)'}`,
        background: statsGroupFilter === '__unassigned__' ? 'rgba(255,0,0,0.1)' : 'transparent',
        color: statsGroupFilter === '__unassigned__' ? 'var(--red)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, "No Group (", unassignedCount, ")");
  })()), matchMode === 'OP Meet' && Object.keys(playerStats).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStatsTeamFilter(null),
    style: {
      padding: '4px 10px',
      borderRadius: 20,
      border: `1px solid ${!statsTeamFilter ? 'var(--purple, #9c27b0)' : 'var(--border)'}`,
      background: !statsTeamFilter ? 'rgba(156,39,176,0.15)' : 'transparent',
      color: !statsTeamFilter ? 'var(--purple, #9c27b0)' : 'var(--text-muted)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "All (", rankedPlayers.length, ")"), teams.map(t => {
    const count = rankedPlayers.filter(p => p.opTeam === t.id).length;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setStatsTeamFilter(t.id),
      style: {
        padding: '4px 10px',
        borderRadius: 20,
        border: `1px solid ${statsTeamFilter === t.id ? 'var(--purple, #9c27b0)' : 'var(--border)'}`,
        background: statsTeamFilter === t.id ? 'rgba(156,39,176,0.15)' : 'transparent',
        color: statsTeamFilter === t.id ? 'var(--purple, #9c27b0)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, "🤝 ", t.name, " (", count, ")");
  }), (() => {
    const unassignedCount = rankedPlayers.filter(p => !p.opTeam).length;
    if (!unassignedCount) return null;
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => setStatsTeamFilter('__unassigned__'),
      style: {
        padding: '4px 10px',
        borderRadius: 20,
        border: `1px solid ${statsTeamFilter === '__unassigned__' ? 'var(--red)' : 'var(--border)'}`,
        background: statsTeamFilter === '__unassigned__' ? 'rgba(255,0,0,0.1)' : 'transparent',
        color: statsTeamFilter === '__unassigned__' ? 'var(--red)' : 'var(--text-muted)',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, "No Team (", unassignedCount, ")");
  })()), Object.keys(playerStats).length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, "Complete games to see player stats here!") : statsEntries.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, "No stats for this filter yet.") : /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "history-table",
    style: {
      tableLayout: 'fixed',
      minWidth: 580
    }
  }, /*#__PURE__*/React.createElement("colgroup", null, /*#__PURE__*/React.createElement("col", {
    style: {
      width: 40
    }
  }), /*#__PURE__*/React.createElement("col", {
    style: {
      width: 160
    }
  }), /*#__PURE__*/React.createElement("col", {
    style: {
      width: 80
    }
  }), /*#__PURE__*/React.createElement("col", {
    style: {
      width: 60
    }
  }), /*#__PURE__*/React.createElement("col", {
    style: {
      width: 60
    }
  }), /*#__PURE__*/React.createElement("col", {
    style: {
      width: 70
    }
  }), /*#__PURE__*/React.createElement("col", {
    style: {
      width: 70
    }
  }), /*#__PURE__*/React.createElement("col", {
    style: {
      width: 70
    }
  }), /*#__PURE__*/React.createElement("col", {
    style: {
      width: 80
    }
  })), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, [{
    col: null,
    label: '#',
    align: 'center'
  }, {
    col: 'name',
    label: 'Player',
    align: 'left'
  }, {
    col: 'level',
    label: 'Level',
    align: 'center'
  }, {
    col: 'games',
    label: 'Games',
    align: 'center'
  }, {
    col: 'wins',
    label: 'Wins',
    align: 'center'
  }, {
    col: 'losses',
    label: 'Losses',
    align: 'center'
  }, {
    col: 'winPct',
    label: 'Win %',
    align: 'center'
  }, {
    col: 'pts',
    label: 'Pts For',
    align: 'center'
  }, {
    col: 'against',
    label: 'Pts Ag.',
    align: 'center'
  }, {
    col: 'diff',
    label: 'Diff',
    align: 'center'
  }].map(({
    col,
    label,
    align
  }) => /*#__PURE__*/React.createElement("th", {
    key: label,
    onClick: col ? () => toggleSort(statsSort, setStatsSort, col) : undefined,
    style: {
      textAlign: align,
      cursor: col ? 'pointer' : 'default',
      userSelect: 'none',
      whiteSpace: 'nowrap'
    }
  }, label, col && /*#__PURE__*/React.createElement(SortIcon, {
    sort: statsSort,
    col: col
  }))))), /*#__PURE__*/React.createElement("tbody", null, statsEntries.map(([id, s]) => {
    const losses = s.games - s.wins;
    const winPct = s.games ? Math.round(s.wins / s.games * 100) : 0;
    const diff = s.pts - s.against;
    return {
      id,
      s,
      losses,
      winPct,
      diff
    };
  }).sort((a, b) => {
    const col = statsSort.col || 'wins';
    const dir = statsSort.dir === 'asc' ? 1 : -1;
    if (col === 'name') return dir * a.s.name.localeCompare(b.s.name);
    if (col === 'level') return dir * (LEVEL_IDX[a.s.level] - LEVEL_IDX[b.s.level]);
    if (col === 'games') return dir * (a.s.games - b.s.games);
    if (col === 'wins') return dir * (a.s.wins - b.s.wins) || b.s.games - a.s.games;
    if (col === 'losses') return dir * (a.losses - b.losses);
    if (col === 'winPct') return dir * (a.winPct - b.winPct);
    if (col === 'pts') return dir * (a.s.pts - b.s.pts);
    if (col === 'against') return dir * (a.s.against - b.s.against);
    if (col === 'diff') return dir * (a.diff - b.diff);
    return 0;
  }).map(({
    id,
    s,
    losses,
    winPct,
    diff
  }, i) => {
    return /*#__PURE__*/React.createElement("tr", {
      key: id
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'center',
        color: 'var(--text-dim)',
        fontWeight: 700
      }
    }, i + 1), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement(GenderTag, {
      gender: s.gender
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 13
      }
    }, s.name))), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement(LevelBadge, {
      level: s.level
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'center',
        fontWeight: 600
      }
    }, s.games), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'center',
        fontWeight: 700,
        color: 'var(--green)'
      }
    }, s.wins), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'center',
        fontWeight: 600,
        color: '#f88'
      }
    }, losses), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 13
      }
    }, winPct, "%"), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 3,
        background: 'var(--surface3)',
        borderRadius: 4,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${winPct}%`,
        height: '100%',
        background: 'var(--green)',
        borderRadius: 4
      }
    })))), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'center',
        fontWeight: 600
      }
    }, s.pts), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'center',
        fontWeight: 600
      }
    }, s.against), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'center',
        fontWeight: 700,
        color: diff >= 0 ? 'var(--green)' : '#f88'
      }
    }, diff >= 0 ? '+' : '', diff));
  }))))), activeTab === 'grouplist' && /*#__PURE__*/React.createElement(GroupListTab, {
    playGroups: playGroups,
    setPlayGroups: setPlayGroups,
    courts: courts,
    setCourts: setCourts,
    showNotif: showNotif
  }), activeTab === 'teamlist' && /*#__PURE__*/React.createElement(TeamListTab, {
    teams: teams,
    setTeams: setTeams,
    showNotif: showNotif
  }), activeTab === 'users' && authUser.role === 'Superadmin' && /*#__PURE__*/React.createElement(UserManagementTab, {
    users: users,
    showNotif: showNotif
  }), sessionModal === 'new' && /*#__PURE__*/React.createElement("div", {
    className: "session-modal-overlay",
    onClick: e => e.target === e.currentTarget && setSessionModal(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "session-modal"
  }, /*#__PURE__*/React.createElement("h2", null, "＋ New Session"), /*#__PURE__*/React.createElement("p", null, "Starting a new session will clear all players, courts, and history from the current session. Make sure to ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--teal)'
    }
  }, "Save"), " first if you want to keep this session!"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      color: 'var(--text-muted)',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: .5,
      display: 'block',
      marginBottom: 6
    }
  }, "Session Name"), /*#__PURE__*/React.createElement("input", {
    placeholder: `Session ${savedSessions.length + 2}`,
    value: newSessionName,
    onChange: e => setNewSessionName(e.target.value),
    onKeyDown: e => e.key === 'Enter' && startNewSession(newSessionName),
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-gold",
    style: {
      flex: 1
    },
    onClick: () => startNewSession(newSessionName)
  }, "Start New Session"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setSessionModal(null)
  }, "Cancel")), history.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-teal btn-sm",
    style: {
      flex: 1
    },
    onClick: () => {
      saveSession();
      setTimeout(() => {
        setSessionModal('new');
      }, 100);
    }
  }, "💾 Save Current First")))), sessionModal === 'load' && /*#__PURE__*/React.createElement("div", {
    className: "session-modal-overlay",
    onClick: e => e.target === e.currentTarget && setSessionModal(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "session-modal"
  }, /*#__PURE__*/React.createElement("h2", null, "📂 Load Session"), /*#__PURE__*/React.createElement("p", null, "Select a previously saved session to restore. Your current session will be replaced."), savedSessions.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state",
    style: {
      padding: '20px 0'
    }
  }, "No saved sessions yet. Hit 💾 Save to save the current session.") : /*#__PURE__*/React.createElement("div", {
    className: "saved-sessions-list"
  }, [...savedSessions].reverse().map(s => /*#__PURE__*/React.createElement("div", {
    key: s.name,
    className: "saved-session-item",
    onClick: () => loadSession(s)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, "📋"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ssi-name"
  }, s.name), /*#__PURE__*/React.createElement("div", {
    className: "ssi-meta"
  }, s.history?.length || 0, " games · ", s.queue?.length || 0, " in queue · Saved ", new Date(s.savedAt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-red btn-sm",
    onClick: e => deleteSession(s.name, e),
    title: "Delete this session",
    style: {
      flexShrink: 0
    }
  }, "✕")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      flex: 1
    },
    onClick: () => setSessionModal(null)
  }, "Close")))), scoreModal && (() => {
    // swapPending: id of the player selected to swap out
    const swapWith = (idA, idB) => {
      // idA is from teamA, idB from teamB — swap them
      setModalTeamA(prev => prev.map(p => p.id === idA ? modalTeamB.find(p2 => p2.id === idB) : p));
      setModalTeamB(prev => prev.map(p => p.id === idB ? modalTeamA.find(p2 => p2.id === idA) : p));
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "score-modal-overlay",
      onClick: e => e.target === e.currentTarget && setScoreModal(null)
    }, /*#__PURE__*/React.createElement("div", {
      className: "score-modal-inner",
      style: {
        width: 400,
        maxWidth: '95vw'
      }
    }, /*#__PURE__*/React.createElement("h2", null, "🏆 Game Over — Court ", scoreModal.courtId), (() => {
      const all = [...modalTeamA, ...modalTeamB];
      const fCount = all.filter(p => p.gender === 'F').length;
      const matchType = fCount === 2 ? '♀♂ Mixed Doubles' : fCount === 4 ? '♀ Women\'s Doubles' : '♂ Men\'s Doubles';
      const matchColor = fCount === 2 ? '#f06292' : fCount === 4 ? '#f06292' : '#64b5f6';
      return /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 800,
          color: matchColor,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginTop: 2,
          marginBottom: 4
        }
      }, matchType);
    })(), /*#__PURE__*/React.createElement("p", {
      style: {
        color: 'var(--text-muted)',
        fontSize: 13,
        marginTop: 4
      }
    }, "Swap players between teams if needed, then enter the score"), /*#__PURE__*/React.createElement("div", {
      style: {
        margin: '16px 0 10px',
        background: 'var(--surface2)',
        borderRadius: 8,
        padding: '12px',
        border: '1px solid var(--border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: 'var(--text-muted)',
        marginBottom: 10
      }
    }, "Tap ⇄ to swap a player across teams"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: 6,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--blue)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        textAlign: 'center'
      }
    }, "Team A"), /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--orange)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        textAlign: 'center'
      }
    }, "Team B"), [0, 1].map(i => {
      const pA = modalTeamA[i];
      const pB = modalTeamB[i];
      if (!pA || !pB) return null;
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: i
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          background: 'var(--surface3)',
          borderRadius: 6,
          padding: '7px 8px',
          border: '1px solid var(--blue)44',
          display: 'flex',
          alignItems: 'center',
          gap: 5
        }
      }, /*#__PURE__*/React.createElement(GenderTag, {
        gender: pA.gender
      }), /*#__PURE__*/React.createElement(LevelBadge, {
        level: pA.level
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          fontWeight: 600
        }
      }, pA.name)), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'center'
        }
      }, /*#__PURE__*/React.createElement("button", {
        title: `Swap ${pA.name} ↔ ${pB.name}`,
        onClick: () => swapWith(pA.id, pB.id),
        style: {
          background: 'var(--surface3)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          cursor: 'pointer',
          color: 'var(--gold)',
          fontSize: 16,
          padding: '6px 8px',
          lineHeight: 1,
          fontWeight: 700,
          transition: 'all 0.15s'
        },
        onMouseOver: e => {
          e.currentTarget.style.background = 'var(--gold-dim)';
          e.currentTarget.style.borderColor = 'var(--gold)';
        },
        onMouseOut: e => {
          e.currentTarget.style.background = 'var(--surface3)';
          e.currentTarget.style.borderColor = 'var(--border)';
        }
      }, "⇄")), /*#__PURE__*/React.createElement("div", {
        style: {
          background: 'var(--surface3)',
          borderRadius: 6,
          padding: '7px 8px',
          border: '1px solid var(--orange)44',
          display: 'flex',
          alignItems: 'center',
          gap: 5
        }
      }, /*#__PURE__*/React.createElement(GenderTag, {
        gender: pB.gender
      }), /*#__PURE__*/React.createElement(LevelBadge, {
        level: pB.level
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          fontWeight: 600
        }
      }, pB.name)));
    }), modalTeamA[0] && modalTeamA[1] && modalTeamB[0] && modalTeamB[1] && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        gridColumn: '1/-1',
        borderTop: '1px solid var(--border)',
        margin: '4px 0'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: 'var(--text-dim)',
        textAlign: 'center',
        gridColumn: '1/-1',
        marginBottom: 2
      }
    }, "cross-swap"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--surface3)',
        borderRadius: 6,
        padding: '7px 8px',
        border: '1px solid var(--blue)44',
        display: 'flex',
        alignItems: 'center',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement(GenderTag, {
      gender: modalTeamA[0].gender
    }), /*#__PURE__*/React.createElement(LevelBadge, {
      level: modalTeamA[0].level
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600
      }
    }, modalTeamA[0].name)), /*#__PURE__*/React.createElement("button", {
      title: `Swap ${modalTeamA[0].name} ↔ ${modalTeamB[1].name}`,
      onClick: () => swapWith(modalTeamA[0].id, modalTeamB[1].id),
      style: {
        background: 'var(--surface3)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        cursor: 'pointer',
        color: 'var(--gold)',
        fontSize: 16,
        padding: '6px 8px',
        lineHeight: 1,
        fontWeight: 700,
        transition: 'all 0.15s'
      },
      onMouseOver: e => {
        e.currentTarget.style.background = 'var(--gold-dim)';
        e.currentTarget.style.borderColor = 'var(--gold)';
      },
      onMouseOut: e => {
        e.currentTarget.style.background = 'var(--surface3)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }
    }, "⇄"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--surface3)',
        borderRadius: 6,
        padding: '7px 8px',
        border: '1px solid var(--orange)44',
        display: 'flex',
        alignItems: 'center',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement(GenderTag, {
      gender: modalTeamB[1].gender
    }), /*#__PURE__*/React.createElement(LevelBadge, {
      level: modalTeamB[1].level
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600
      }
    }, modalTeamB[1].name)), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--surface3)',
        borderRadius: 6,
        padding: '7px 8px',
        border: '1px solid var(--blue)44',
        display: 'flex',
        alignItems: 'center',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement(GenderTag, {
      gender: modalTeamA[1].gender
    }), /*#__PURE__*/React.createElement(LevelBadge, {
      level: modalTeamA[1].level
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600
      }
    }, modalTeamA[1].name)), /*#__PURE__*/React.createElement("button", {
      title: `Swap ${modalTeamA[1].name} ↔ ${modalTeamB[0].name}`,
      onClick: () => swapWith(modalTeamA[1].id, modalTeamB[0].id),
      style: {
        background: 'var(--surface3)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        cursor: 'pointer',
        color: 'var(--gold)',
        fontSize: 16,
        padding: '6px 8px',
        lineHeight: 1,
        fontWeight: 700,
        transition: 'all 0.15s'
      },
      onMouseOver: e => {
        e.currentTarget.style.background = 'var(--gold-dim)';
        e.currentTarget.style.borderColor = 'var(--gold)';
      },
      onMouseOut: e => {
        e.currentTarget.style.background = 'var(--surface3)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }
    }, "⇄"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--surface3)',
        borderRadius: 6,
        padding: '7px 8px',
        border: '1px solid var(--orange)44',
        display: 'flex',
        alignItems: 'center',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement(GenderTag, {
      gender: modalTeamB[0].gender
    }), /*#__PURE__*/React.createElement(LevelBadge, {
      level: modalTeamB[0].level
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600
      }
    }, modalTeamB[0].name))))), scoringEnabled ? /*#__PURE__*/React.createElement("div", {
      className: "score-inputs"
    }, /*#__PURE__*/React.createElement("div", {
      className: "score-team"
    }, /*#__PURE__*/React.createElement("label", null, "Team A", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-main)'
      }
    }, modalTeamA.map(p => p.name).join(' & '))), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      max: "99",
      value: scoreA,
      onChange: e => setScoreA(e.target.value),
      placeholder: "0",
      autoFocus: true
    })), /*#__PURE__*/React.createElement("div", {
      className: "score-team"
    }, /*#__PURE__*/React.createElement("label", null, "Team B", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-main)'
      }
    }, modalTeamB.map(p => p.name).join(' & '))), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      max: "99",
      value: scoreB,
      onChange: e => setScoreB(e.target.value),
      placeholder: "0"
    }))) : winLoseEnabled ? /*#__PURE__*/React.createElement("div", {
      className: "score-inputs"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setWinLoseWinner('A'),
      className: "score-team",
      style: {
        cursor: 'pointer',
        border: winLoseWinner === 'A' ? '2px solid var(--gold)' : '1px solid var(--border)',
        background: winLoseWinner === 'A' ? 'var(--gold-dim)' : 'var(--surface2)',
        borderRadius: 8,
        padding: '10px'
      }
    }, /*#__PURE__*/React.createElement("label", null, "Team A", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-main)'
      }
    }, modalTeamA.map(p => p.name).join(' & '))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        marginTop: 6,
        color: winLoseWinner === 'A' ? 'var(--gold)' : 'var(--text-muted)',
        fontWeight: 700
      }
    }, winLoseWinner === 'A' ? '🏆 Won' : 'Tap if won')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setWinLoseWinner('B'),
      className: "score-team",
      style: {
        cursor: 'pointer',
        border: winLoseWinner === 'B' ? '2px solid var(--gold)' : '1px solid var(--border)',
        background: winLoseWinner === 'B' ? 'var(--gold-dim)' : 'var(--surface2)',
        borderRadius: 8,
        padding: '10px'
      }
    }, /*#__PURE__*/React.createElement("label", null, "Team B", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-main)'
      }
    }, modalTeamB.map(p => p.name).join(' & '))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        marginTop: 6,
        color: winLoseWinner === 'B' ? 'var(--gold)' : 'var(--text-muted)',
        fontWeight: 700
      }
    }, winLoseWinner === 'B' ? '🏆 Won' : 'Tap if won'))) : null, /*#__PURE__*/React.createElement("div", {
      className: "modal-btns"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-green",
      style: {
        flex: 1
      },
      onClick: submitScore
    }, "Save Score & Return Players"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost",
      onClick: () => setScoreModal(null)
    }, "Cancel"))));
  })());
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));