﻿using System.Collections.Generic;

namespace ChessVariantsTraining.ViewModels
{
    public class User
    {
        public string Username { get; private set; }
        public string About { get; private set; }
        public int PuzzlesCorrect { get; private set; }
        public int PuzzlesWrong { get; private set; }
        public List<string> Roles { get; private set; }
        public int PuzzlesMade
        {
            get
            {
                return PuzzlesCorrect + PuzzlesWrong;
            }
        }

        public User(string username)
        {
            Username = username;
        }

        public User(Models.User user)
        {
            Username = user.Username;
            About = user.About;
            PuzzlesCorrect = user.PuzzlesCorrect;
            PuzzlesWrong = user.PuzzlesWrong;
            Roles = user.Roles;
        }
    }
}
