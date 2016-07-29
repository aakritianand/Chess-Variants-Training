﻿function startWithRandomPuzzle() {
    jsonXhr("/Puzzle/Train/GetOneRandomly" + (window.trainingSessionId ? "?trainingSessionId=" + window.trainingSessionId : ""), "GET", null, function (req, jsonResponse) {
        setup(jsonResponse["id"]);
    }, function (req, err) {
        alert(err);
    });
}

function setup(puzzleId) {
    jsonXhr("/Puzzle/Train/Setup", "POST", "id=" + puzzleId + (window.trainingSessionId ? "&trainingSessionId=" + window.trainingSessionId : ""), function (req, jsonResponse) {
        window.puzzleId = puzzleId;
        window.replay = null;
        window.ground.set({
            fen: jsonResponse["fen"],
            orientation: jsonResponse["whoseTurn"],
            turnColor: jsonResponse["whoseTurn"],
            lastMove: null,
            selected: null,
            movable: {
                free: false,
                dests: jsonResponse["dests"]
            }
        });
        clearExplanation();
        clearPuzzleRating();
        clearComments();
        loadComments();
        document.getElementById("puzzleLinkContainer").setAttribute("class", "nodisplay");
        document.getElementById("result").setAttribute("class", "blue");
        document.getElementById("result").innerHTML = "Find the best move!";
        document.getElementById("author").textContent = jsonResponse["author"];
        document.getElementById("controls").classList.add("nodisplay");
        window.trainingSessionId = jsonResponse["trainingSessionId"];
    }, function (req, err) {
        alert(err);
    });
}

function showPuzzleRating(r) {
    document.getElementById("puzzleRating").innerHTML = "Puzzle rating: " + r;
}

function clearPuzzleRating() {
    document.getElementById("puzzleRating").innerHTML = "";
}

function showExplanation(expl) {
    document.getElementById("explanation").innerHTML = expl;
}

function clearExplanation() {
    document.getElementById("explanation").innerHTML = "";
}

function processPuzzleMove(origin, destination, metadata) {
    if (ChessgroundExtensions.needsPromotion(window.ground, destination)) {
        ChessgroundExtensions.drawPromotionDialog(origin, destination, document.getElementById("chessground"), submitPuzzleMove, window.ground);
    } else {
        submitPuzzleMove(origin, destination, null);
    }
}

function submitPuzzleMove(origin, destination, promotion) {
    jsonXhr("/Puzzle/Train/SubmitMove", "POST", "id=" + window.puzzleId + "&trainingSessionId=" + window.trainingSessionId + "&origin=" + origin + "&destination=" + destination + (promotion ? "&promotion=" + promotion : ""), function (req, jsonResponse) {
        if (jsonResponse["fen"]) {
            window.ground.set({
                fen: jsonResponse["fen"]
            });
        }
        if (jsonResponse["check"]) {
            window.ground.setCheck(jsonResponse["check"]);
        } else {
            window.ground.set({ check: null });
        }
        if (jsonResponse["play"]) {
            window.ground.set({
                fen: jsonResponse["fenAfterPlay"],
                lastMove: jsonResponse["play"].substr(0, 5).split("-")
            });
            if (jsonResponse["checkAfterAutoMove"]) {
                window.ground.setCheck(jsonResponse["checkAfterAutoMove"]);
            }
        }
        switch (jsonResponse["correct"]) {
            case 0:
                break;
            case 1:
                document.getElementById("puzzleLinkContainer").classList.remove("nodisplay");
                with (document.getElementById("result")) {
                    textContent = "Success!";
                    setAttribute("class", "green");
                };
                break;
            case -1:
                document.getElementById("puzzleLinkContainer").classList.remove("nodisplay");
                window.ground.set({ lastMove: null });
                with (document.getElementById("result")) {
                    textContent = "Sorry, that's not correct. This was correct: " + jsonResponse["solution"];
                    setAttribute("class", "red");
                }
        }
        if (jsonResponse["dests"]) {
            window.ground.set({
                movable: {
                    dests: jsonResponse["dests"]
                }
            });
        }
        if (jsonResponse["explanation"]) {
            showExplanation(jsonResponse["explanation"]);
        }
        if (jsonResponse["rating"]) {
            showPuzzleRating(jsonResponse["rating"]);
        }
        if (jsonResponse["replayFens"]) {
            window.replay = {};
            window.replay.fens = jsonResponse["replayFens"];
            window.replay.current = window.replay.fens.indexOf(jsonResponse["fen"] || window.ground.getFen());
            window.replay.checks = jsonResponse["replayChecks"];
            window.replay.moves = jsonResponse["replayMoves"];
            document.getElementById("controls").classList.remove("nodisplay");
        }
    }, function (req, err) {
        alert(err);
    });
}

function submitComment(e) {
    e = e || window.event;
    e.preventDefault();
    jsonXhr("/Comment/PostComment", "POST", "commentBody=" + encodeURIComponent(document.getElementById("commentBody").value) + "&puzzleId=" + window.puzzleId, function (req, jsonResponse) {
        document.getElementById("commentBody").value = "";
        clearComments();
        loadComments();
    },
    function (req, err) {
        alert(err);
    });
}

function clearComments() {
    var commentContainer = document.getElementById("commentContainer");
    while (commentContainer.firstChild) {
        commentContainer.removeChild(commentContainer.firstChild);
    }
}

function loadComments() {
    xhr("/Comment/ViewComments?puzzleId=" + window.puzzleId, "GET", null, function (req) {
        document.getElementById("commentContainer").innerHTML = req.responseText;
        var comments = document.getElementById("commentContainer").querySelectorAll(".comment");
        for (var i = 0; i < comments.length; i++) {
            comments[i].style.marginLeft = comments[i].dataset.indentlevel + "vw";
        }
        var voteLinks = document.getElementById("commentContainer").querySelectorAll("a[data-vote]");
        for (var i = 0; i < voteLinks.length; i++) {
            voteLinks[i].addEventListener("click", voteClicked);
        }
        var replyLinks = document.getElementById("commentContainer").querySelectorAll("a[data-to]");
        for (var i = 0; i < replyLinks.length; i++) {
            replyLinks[i].addEventListener("click", replyLinkClicked);
        }
        var sendLinks = document.getElementById("commentContainer").getElementsByClassName("send-reply");
        for (var i = 0; i < sendLinks.length; i++) {
            sendLinks[i].addEventListener("click", sendLinkClicked);
        }
        var cancelLinks = document.getElementById("commentContainer").getElementsByClassName("cancel-reply");
        for (var i = 0; i < cancelLinks.length; i++) {
            cancelLinks[i].addEventListener("click", cancelLinkClicked);
        }
        var reportLinks = document.getElementById("commentContainer").getElementsByClassName("report-link");
        for (var i = 0; i < reportLinks.length; i++) {
            reportLinks[i].addEventListener("click", reportLinkClicked);
        }
        var modLinks = document.getElementById("commentContainer").getElementsByClassName("mod-link");
        for (var i = 0; i < modLinks.length; i++) {
            modLinks[i].addEventListener("click", modLinkClicked);
        }
        if (window.location.search !== "") {
            var matches = /[?&]c=[0-9a-zA-Z_-]+/.exec(window.location.search);
            if (matches) {
                var id = matches[0].slice(3);
                var highlighted = document.getElementById(id);
                if (highlighted) {
                    highlighted.scrollIntoView(true);
                    highlighted.style.backgroundColor = "#feb15a";
                }
            }
        }
    }, function (req, err) {
        alert(err);
    });
}

function upvoteComment(commentId) {
    jsonXhr("/Comment/Upvote", "POST", "commentId=" + commentId, function (req, jsonResponse) {
        clearComments();
        loadComments();
    }, function (req, err) {
        alert(err);
    });
}

function downvoteComment(commentId) {
    jsonXhr("/Comment/Downvote", "POST", "commentId=" + commentId, function (req, jsonResponse) {
        clearComments();
        loadComments();
    }, function (req, err) {
        alert(err);
    });
}

function undoVote(commentId) {
    jsonXhr("/Comment/UndoVote", "POST", "commentId=" + commentId, function (req, jsonResponse) {
        clearComments();
        loadComments();
    }, function (req, err) {
        alert(err);
    });
}

function sendReply(to, body) {
    jsonXhr("/Comment/Reply", "POST", "to=" + to + "&body=" + encodeURIComponent(body) + "&puzzleId=" + window.puzzleId, function (req, jsonResponse) {
        clearComments();
        loadComments();
    },
    function (req, err) {
        alert(err);
    });
}

function voteClicked(e) {
    e = e || window.event;
    e.preventDefault();
    var target = e.target;
    if (target.dataset.vote === "up") {
        if (target.classList.contains("upvote-highlighted")) {
            undoVote(target.dataset.commentid);
        } else {
            upvoteComment(target.dataset.commentid);
        }
    } else {
        if (target.classList.contains("downvote-highlighted")) {
            undoVote(target.dataset.commentid);
        } else {
            downvoteComment(target.dataset.commentid);
        }
    }
}

function replyLinkClicked(e) {
    e = e || window.event;
    e.preventDefault();
    (document.getElementById("to-" + e.target.dataset.to) || { style: {} }).style.display = "block";
}

function sendLinkClicked(e) {
    e = e || window.event;
    e.preventDefault();
    var to = e.target.parentElement.id.slice(3);
    var body = e.target.parentElement.firstElementChild.value;
    sendReply(to, body);
}

function cancelLinkClicked(e) {
    e = e || window.event;
    e.preventDefault();
}

function reportLinkClicked(e) {
    e = e || window.event;
    e.preventDefault();
    var itemToReport = e.target.dataset.item;
    if (!window.reportDialogHtml) {
        xhr("/Report/Dialog/Comment", "GET", null, function (req) {
            window.reportDialogHtml = req.responseText;
            showReportDialog(itemToReport);
        }, function (req, err) {
            alert(err);
        });
    }
    else {
        showReportDialog(itemToReport);
    }
}

function showReportDialog(itemToReport) {
    var itemToReportElement = document.getElementById(itemToReport);
    itemToReportElement.getElementsByClassName("comment-content")[0].style.display = "none";
    itemToReportElement.insertAdjacentHTML("beforeend", window.reportDialogHtml);
    itemToReportElement.getElementsByClassName("report-dialog")[0].lastElementChild.addEventListener("click", reportLinkInDialogClicked);
}

function removeReportDialog(itemReported) {
    var itemReportedElement = document.getElementById(itemReported);
    itemReportedElement.getElementsByClassName("comment-content")[0].style.display = "flex";
    itemReportedElement.removeChild(itemReportedElement.getElementsByClassName("report-dialog")[0]);
}

function reportLinkInDialogClicked(e) {
    e = e || window.event;
    e.preventDefault();
    var parent = e.target.parentElement;
    jsonXhr("/Report/Submit/Comment", "POST", "item=" + parent.parentElement.id + "&reason=" + parent.getElementsByTagName("select")[0].value + "&reasonExplanation=" + encodeURIComponent(parent.getElementsByTagName("textarea")[0].value),
        function (req, jsonResponse) {
            removeReportDialog(parent.parentElement.id);
        },
        function (req, err) {
            alert(err);
        });
}

function modLinkClicked(e) {
    e = e || window.event;
    e.preventDefault();
    var action = e.target.dataset.action;
    var commentId = e.target.dataset.commentid;
    jsonXhr("/Comment/Mod/" + action, "POST", "commentId=" + commentId, function (req, jsonResponse) {
        clearComments();
        loadComments();
    }, function (req, err) {
        alert(err);
    });
}

function nextPuzzle(e) {
    e = e || window.event;
    if (e.target.getAttribute("href") !== "#") return true;
    e.preventDefault();
    startWithRandomPuzzle();
}

function retryPuzzle(e) {
    e.preventDefault();
    setup(window.puzzleId);
}

function replayControlClicked(e) {
    if (!window.replay) return;
    if (e.target.id === "controls-begin") {
        window.replay.current = 0;
    } else if (e.target.id === "controls-prev" && window.replay.current !== 0) {
        window.replay.current--;
    } else if (e.target.id === "controls-next" && window.replay.current !== window.replay.fens.length - 1) {
        window.replay.current++;
    } else if (e.target.id === "controls-end") {
        window.replay.current = window.replay.fens.length - 1;
    }
    var lastMove = window.replay.moves[window.replay.current];
    window.ground.set({
        fen: window.replay.fens[window.replay.current],
        lastMove: lastMove ? lastMove.substr(0, 5).split("-") : null
    });
    var currentCheck = window.replay.checks[window.replay.current];
    if (currentCheck) {
        window.ground.setCheck(currentCheck);
    } else {
        window.ground.set({ check: null });
    }
}

window.addEventListener("load", function () {
    window.ground = Chessground(document.getElementById("chessground"), {
        coordinates: false,
        movable: {
            free: false,
            dropOff: "revert",
            showDests: false,
            events: {
                after: processPuzzleMove
            }
        }
    });
    var submitCommentLink = document.getElementById("submitCommentLink");
    if (submitCommentLink) {
        submitCommentLink.addEventListener("click", submitComment);
    }
    document.getElementById("nextPuzzleLink").addEventListener("click", nextPuzzle);
    document.getElementById("retryPuzzleLink").addEventListener("click", retryPuzzle);
    if (!window.selectedPuzzle) {
        startWithRandomPuzzle();
    } else {
        setup(window.selectedPuzzle);
    }
    var controlIds = ["controls-begin", "controls-prev", "controls-next", "controls-end"];
    for (var i = 0; i < controlIds.length; i++) {
        document.getElementById(controlIds[i]).addEventListener("click", replayControlClicked);
    }
});