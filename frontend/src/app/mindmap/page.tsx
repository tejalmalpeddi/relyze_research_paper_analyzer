// app/mindmap/page.tsx
//
// Shown at "/mindmap". There are two ways to land here, and this page
// has to handle both, each asking the backend for exactly the one row
// it needs -- no downloading-everything-and-searching involved either
// way:
//
//   1. With a "?id=" query parameter -- this is where the "redirect"
//      button on a PreviousPapers card (see PaperCard's
//      handleRedirectButtonClick in components/History.tsx) sends the
//      user, telling this page exactly WHICH paper to show. This case
//      calls fetchHistoryById (GET /history/{id}).
//   2. With no query parameter at all -- this is what happens when
//      someone clicks the plain "Mind Map" tab in the navbar. In that
//      case, there's no specific paper requested, so this page instead
//      defaults to showing whichever paper was saved MOST RECENTLY, via
//      fetchLatestHistory (GET /history/latest) -- the database sorts
//      and picks the newest row itself.

"use client";

import { useEffect, useState } from "react"; //react hooks. state: to remember a value across renders. effect: run code in response to something changing. never runs in server, browser dependent fully
import dynamic from "next/dynamic"; //next.js package component. react flow can't be rendered on server, needs browser 
//but next.js tries to render all pages server side to this dynamic keyword tells don't try to build this component on server
import { useSearchParams } from "next/navigation"; //reading + changing url //curly braces: fixed syntactic name
import Navbar from "@/components/Navbar"; //path alias prefix: @/ so it resolves to real file. no need recalc relative paths with ../ just use @/..
import { fetchHistoryById, fetchLatestHistory } from "@/lib/api";
import { HistoryEntry } from "@/lib/types";

// what comes back from dynamic(...) isn't the real MindMapView component itself —
// it's a special wrapper component that Next.js builds for you, one that knows how 
// to load the real thing lazily and swap it in once ready. So later in this file, 
// <MindMapView entry={matchedEntry} /> is actually rendering this wrapper, not MindMap.tsx's MindMapView

// return of this function is stored in MindMapView. 
// function checks if code from MindMap.tsx has arrived yet, and if not, goes and fetches it. 
const MindMapView = dynamic(
  () => import("@/components/MindMap").then((module) => ({ default: module.MindMapView })), //Promise returned 
  { ssr: false } //don't render on server 
);

//page.tsx will be default render for /mindmap route
//function MindMapPage() { ... } is just a blueprint — like a recipe written on paper. 
// The recipe itself doesn't "hold" any ingredients; it only becomes a real thing when 
// someone actually cooks from it. Every time Next.js needs to show the /mindmap route, 
// it "cooks" this recipe — creates an actual, live, running copy of it. React's internal 
// state (everything from useState) is tied to that one specific live copy, not to the 
// recipe/blueprint sitting in the file.

export default function MindMapPage() {
  // useSearchParams() reads whatever comes after the "?" in the current
  // URL. For a URL like "/mindmap?id=42", searchParams.get("id") gives
  // back the string "42". For a plain "/mindmap" with no "?" at all, it
  // gives back null.

  //url example: http://localhost:3000/mindmap?id=1. part after ? is query string 
  //useSearchParams hands back object build on query string 
  const searchParams = useSearchParams();
  //get("id") will return 1 as text or whatever ID is no matter how long query string is
  //we are on mindmap page so already should have selected a paper id to render! 
  const requestedIdText = searchParams.get("id");

  //useState is a function. Every single time you call it, it hands back an array 
  // with exactly two things in it: (1) the current value being remembered, 
  // and (2) a function you can call to change that value. 
  //setMatchedEntry function is called later in code and over there, it is handed a diff value
  //calling setMatchedEntry function updates the stored value and tells react to rerender component with new value 
  const [matchedEntry, setMatchedEntry] = useState<HistoryEntry | null>(null);
  //matchedEntry is either a HistoryEntry object or null
  //argument passed in parenthesis: null: is initial value at first ever render. 
  //matchedEntry's current value is stored in React's memory and calling function
  
  const [isLoading, setIsLoading] = useState(true);
  //type by default is boolean <>
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  //Whether state survives depends on whether you ever actually left the /mindmap route. 
  // Bouncing between different ?id= values while staying on /mindmap keeps the same instance 
  // alive (state carries over, needing the manual setIsLoading(true) reset you already have). 
  // Leaving to a totally different page and coming back always gives you a completely fresh 
  // instance, with zero memory of anything from before — which is also, incidentally, exactly 
  // why the homepage's PreviousPapersSection has to re-fetch the whole paper list every single 
  // time you land back on /, rather than remembering it from a previous visit.

  useEffect(() => {
    setIsLoading(true);

    if (requestedIdText !== null) {
      // Reached via a specific paper's "redirect" button -- ask the
      // backend for exactly that one row (GET /history/{id}). A missing
      // id (a 404 from the backend) is treated the same way it always
      // was here: matchedEntry just stays null, and notFoundMessage
      // below explains why -- not shown as a loud error.
      const requestedIdNumber = Number(requestedIdText); //convert query text to number
      fetchHistoryById(requestedIdNumber) //api.ts route, parameter new 
        .then((fetchedEntry) => { //fetchedEntry is the HistoryEntry object 
          setMatchedEntry(fetchedEntry); //stored as a paper to display 
          setLoadErrorMessage(null); //clear out previous attempt 
        })
        .catch(() => {
          setMatchedEntry(null);
          setLoadErrorMessage(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Reached via the plain "Mind Map" navbar tab, with no specific
      // paper requested -- ask the backend directly for whichever paper
      // was saved most recently (GET /history/latest). 
      fetchLatestHistory()
        .then((fetchedEntry) => {
          setMatchedEntry(fetchedEntry);
          setLoadErrorMessage(null);
        })
        .catch(() => {
          setMatchedEntry(null);
          setLoadErrorMessage(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [requestedIdText]);

  //^^ is the second argument to the useEffect, dependency array. 
  //when it changes, function is re-run 

  // Now decide what message to show if there's nothing to render yet --
  // the wording is different depending on whether a specific id was
  // requested (and just didn't match anything) versus no id being
  // requested at all (meaning there are simply no papers saved yet).
  let notFoundMessage: string;
  if (requestedIdText !== null) {
    notFoundMessage = `No saved paper found with id "${requestedIdText}".`;
  } else {
    notFoundMessage = "No papers saved yet -- upload one from the homepage to get started.";
  }

  //each component has something to return that is frontend 
  //Every time this component re-renders (state change, dependency change, whatever), 
  // this entire return block runs again, and React compares the new result to what 
  // was on screen before, updating only what actually changed.

  //this is JSX, looks like HTML but converted to plain JS 
  return (
    <div className="flex h-screen flex-col"> {/* This is a JSX comment */}
      <Navbar /> {/* Navbar.tsx entire return pasted here */}

      <div className="flex-1 bg-[#17181a]">

        {/* {someCondition && <div>...</div>} becomes a clean idiom: "render this JSX if the 
        condition is true, render nothing at all if it's false." */}
        {isLoading === true && (
          <div className="flex h-full items-center justify-center font-serif text-stone-400">
            Loading...
          </div>
        )}

        {isLoading === false && loadErrorMessage !== null && (
          <div className="flex h-full items-center justify-center font-serif text-[#c1666b]">
            Couldn&apos;t load your papers: {loadErrorMessage}
          </div>
        )}

        {isLoading === false && loadErrorMessage === null && matchedEntry === null && (
          <div className="flex h-full items-center justify-center font-serif text-stone-400">
            {notFoundMessage}
          </div>
        )}

        {/*Right when the page first loads, matchedEntry is null (its starting value from 
        useState<HistoryEntry | null>(null)) → matchedEntry !== null is false.
        After fetchHistoryById(1) succeeds and setMatchedEntry(fetchedEntry) runs, 
        matchedEntry becomes a real object like { id: 1, title: "Quantum Computing", ... } → 
        now matchedEntry !== null is true*/}

        {/* If there is a id, then MindMapView is executed with that id */}
        {matchedEntry !== null && <MindMapView entry={matchedEntry} />}
      </div>
    </div>
  );
}
