import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronUp,
  ChevronDown,
  KeyRound,
  LogOut,
  DoorOpen,
  SquarePen,
  Droplets,
} from "lucide-react";
import { CpuIcon, MapPinCheck, WindIcon, ChartSpline } from "lucide-react";

const UserProfile = ({ username, email, onLogout, onResetPassword }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="absolute bottom-0 left-0 w-full border-t border-gray-200">
      <div
        className="p-4 hover:bg-gray-50 cursor-pointer"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {username.charAt(0)}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {username}
              </h3>
              <p className="text-xs text-gray-500">{email}</p>
            </div>
          </div>
          {isDropdownOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
        {isDropdownOpen && (
          <div className="mt-2 py-1 border-t border-gray-100">
            <button
              onClick={onResetPassword}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <KeyRound className="w-4 h-4 mr-2" /> Reset Password
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, logout }) {
  const sidebarRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const [openDropdown, setOpenDropdown] = useState("リアルタイムデータ");  
  const [user, setUser] = useState({
    username: "John Doe",
    email: "john.doe@example.com",
  });
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  // Auth0 Management API configuration
  const config = {
    domain: "optimus-sandbox.us.auth0.com",
    clientId: "yuB3H9KXumDFmTJxmJAZaHWU4lKTdsw1",
    audience: "https://optimus-sandbox.us.auth0.com/api/v2/",
  };

  // Fetch access token
  const getAccessToken = async () => {
    const response = await fetch(`https://${config.domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret:
          "IimPkgggEtML5dusNSqzBAD7kYF80eY5q-hZxaktThaZEjhCjUsGyBhrYzkaeHEs",
        audience: config.audience,
        grant_type: "client_credentials",
        scope:
          "read:users read:users_app_metadata update:users_app_metadata read:user_idp_tokens read:client_grants create:users update:users delete:users read:clients read:client_credentials create:client_credentials read:roles update:roles create:roles",
      }),
    });
    const data = await response.json();
    return data.access_token;
  };

  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      updateMenuItems(storedUser.role);
    } else {
      setUser(null); // ✅ Ensure user is null if not logged in
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user"); // 🛑 Clear stored user data
    localStorage.removeItem("access_token"); // 🛑 Clear auth token
    setUser(null); // ✅ Reset user state
    setMenuItems([]); // ✅ Reset menu items
    navigate("/login", { replace: true }); // ✅ Redirect to login
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch(`${config.audience}users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          const storedUser = JSON.parse(localStorage.getItem("user"));

          const auth0User = data.find((u) => u.email === storedUser?.email);

          if (auth0User) {
            const userData = {
              username:
                auth0User.user_metadata?.username ||
                auth0User.email.split("@")[0],
              email: auth0User.email,
              role: auth0User.app_metadata?.role || "User",
            };

            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData)); // ✅ Save the new user correctly

            console.log("Fetched User Role:", userData.role);

            // ✅ Update Menu Items Based on Role
            updateMenuItems(userData.role);
          }
        } else {
          console.error("Failed to fetch users:", await response.text());
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    console.log("User in Sidebar:", user);
  }, [user]);

  useEffect(() => {
    console.log("Sidebar Menu Items:", menuItems);
  }, [menuItems]);

  const updateMenuItems = (role) => {
    const updatedMenu = [
      {
        name: "リアルタイムデータ",
        alwaysOpen: true,
        children: [
          {
            name: "フロアプランダッシュボード​",
            path: "/dashboard",
            icon: (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="M19 21V9L9 3v18" />
                <path d="M9 3L19 9" />
              </svg>
            ),
          },
          {
            name: "非常用ドアの状況​​",
            path: "/security-view",
            icon: <DoorOpen size={21} />,
          },
          { name: "環境ウェルネス​​", path: "/iaq", icon: <WindIcon size={21} /> },
          { name: "水漏れ​", path: "/leakage", icon: <Droplets size={20} /> },
        ],
      },
      {
        name: "歴史とトレンド​",
        children: [
          {
            name: "分析",
            path: "/analytics",
            icon: <ChartSpline size={21} />,
          },
          // { name: "Historical Data", path: "/historical", icon: (<img src='./time.png' width={20} height={20}  alt="historical"/>) },
        ],
      },

      {
        name: "スペースの管理​",
        children: [
          {
            name: "スペース詳細を編集",
            path: "/editspaces",
            icon: (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 113 3L5 21H2v-3L16.5 3.5z" />
              </svg>
            ),
          },
          {
            name: "コール番号を編集",
            path: "/callnumber",
            icon: <SquarePen size={21} />,
          },
          {
            name: "デスクロジックを編集",
            path: "/desk-logic",
            icon: <SquarePen size={21} />,
          },
          {
            name: "設備を編集",
            path: "/facility",
            icon: <MapPinCheck size={21} />,
          },
          {
            name: "フロアプランを編集",
            path: "/editor",
            icon: (
              <img
                width="20"
                height="20"
                src="https://img.icons8.com/metro/26/floor-plan.png"
                alt="floor-plan"
              />
            ),
          },
        ],
      },

      // {
      //  name: "Search",
      // children: [
      // { name: "Book Search", path: "#", disabled: true, icon: (<img width="20" height="20" src="https://img.icons8.com/external-others-ghozy-muhtarom/32/external-books-school-outline-others-ghozy-muhtarom.png" alt="external-books-school-outline-others-ghozy-muhtarom"/>) },
      // { name: "Facility Search", path: "/facility", icon: (<img width="20" height="20" src="https://img.icons8.com/parakeet-line/48/marker.png" alt="marker"/>) },
      // { name: "Test", path: "/test", icon: (<img width="20" height="20" src="https://img.icons8.com/parakeet-line/48/marker.png" alt="marker"/>) },

      // ],
      // },
      {
        name: "設定​",
        children: [
          {
            name: "デバイスの管理",
            path: "/devices",
            icon: <CpuIcon className="w-5 h-5" />,
          },

          ...(role === "Admin"
            ? [
                {
                  name: "ユーザーの管理",
                  path: "/users",
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M6 21v-2a6 6 0 0112 0v2" />
                    </svg>
                  ),
                },
              ]
            : []),
        ],
      },
    ];

    setMenuItems(updatedMenu);
    console.log("Updated Sidebar Menu Items:", updatedMenu);
  };

  // Close sidebar if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter menu items based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredItems(menuItems);
      setOpenDropdown("リアルタイムデータ");
    } else {
      const filtered = menuItems
        .map((item) => {
          const matchingChildren = item.children.filter((child) =>
            child.name.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (
            matchingChildren.length > 0 ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            return { ...item, children: matchingChildren };
          }

          return null;
        })
        .filter(Boolean);

      setFilteredItems(filtered);

      if (filtered.length > 0) {
        setOpenDropdown(filtered[0].name);
      }
    }
  }, [searchQuery, menuItems]);

  // Handle "Cmd + K" to focus the search bar
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("search-bar").focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!user) return <div>Loading...</div>;

  const handleNavigate = (path) => {
    if (path !== "#") {
      navigate(path);
      setIsSidebarOpen(false);
    }
  };

  const sendPasswordResetEmail = async () => {
    try {
      const response = await fetch(
        "https://optimus-sandbox.us.auth0.com/dbconnections/change_password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: "yuB3H9KXumDFmTJxmJAZaHWU4lKTdsw1",
            email: user.email,
            connection: "Username-Password-Authentication",
          }),
        }
      );

      if (response.ok) {
        setIsOverlayOpen(true); // Show overlay message
        setTimeout(() => setIsOverlayOpen(false), 3000); // Auto-close after 3 seconds
      } else {
        const errorData = await response.json();
        alert(errorData.error_description || "Failed to send reset email.");
      }
    } catch (error) {
      console.error("Error sending password reset email:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div>
      <div
        className={`fixed inset-0 bg-black bg-opacity-40 transition-opacity duration-200 ${
          isSidebarOpen ? "opacity-100 visible z-20" : "opacity-0 invisible"
        }`}
      ></div>
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full bg-white shadow-lg md:w-[396px] w-[366px] transition-transform duration-300 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } z-30`}
      >
        <div className="flex items-center justify-between pt-4 pl-4 pr-4 pb-1">
          <div className="flex">
            <img src="/sp.svg" alt="SP Logo" className="h-8 my-2" />
            <h2 className="text-[20px] pl-2 font-semibold">
              
            </h2>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="w-14 h-8 flex items-center justify-center font-semibold text-gray-400 hover:text-gray-900"
          >
            X
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative p-4">
          <input
            id="search-bar"
            type="text"
            placeholder="検索"
            className="w-[96%] pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-7 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              x="0px"
              y="0px"
              width="20"
              height="20"
              viewBox="0,0,256,256"
            >
              <g
                fill="#4d4d4d"
                fill-rule="nonzero"
                stroke="none"
                stroke-width="1"
                stroke-linecap="butt"
                stroke-linejoin="miter"
                stroke-miterlimit="10"
                stroke-dasharray=""
                stroke-dashoffset="0"
                font-family="none"
                font-weight="none"
                font-size="none"
                text-anchor="none"
              >
                <g transform="scale(8.53333,8.53333)">
                  <path d="M13,3c-5.511,0 -10,4.489 -10,10c0,5.511 4.489,10 10,10c2.39651,0 4.59738,-0.85101 6.32227,-2.26367l5.9707,5.9707c0.25082,0.26124 0.62327,0.36648 0.97371,0.27512c0.35044,-0.09136 0.62411,-0.36503 0.71547,-0.71547c0.09136,-0.35044 -0.01388,-0.72289 -0.27512,-0.97371l-5.9707,-5.9707c1.41266,-1.72488 2.26367,-3.92576 2.26367,-6.32227c0,-5.511 -4.489,-10 -10,-10zM13,5c4.43012,0 8,3.56988 8,8c0,4.43012 -3.56988,8 -8,8c-4.43012,0 -8,-3.56988 -8,-8c0,-4.43012 3.56988,-8 8,-8z"></path>
                </g>
              </g>
            </svg>
          </span>
          <span className="absolute right-[68px] top-1/2 transform -translate-y-1/2 bg-[#d1d1d157] text-gray-700 text-xs font-semibold px-2 py-1 rounded">
            ⌘
          </span>
          <span className="absolute right-10 top-1/2 transform -translate-y-1/2 bg-[#d1d1d157] text-gray-700 font-medium text-xs px-2 py-1 rounded">
            K
          </span>
        </div>

        <ul>
          {filteredItems.map((item, index) => (
            <li key={index}>
              <button
                className={`flex items-center font-semibold justify-between w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 ${
                  openDropdown === item.name ? "bg-gray-100" : ""
                }`}
                onClick={() =>
                  setOpenDropdown(openDropdown === item.name ? "" : item.name)
                }
              >
                <span>{item.name}</span>
                {openDropdown === item.name ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {openDropdown === item.name && (
                <ul className="pl-6">
                  {item.children.map((child, childIndex) => (
                    <li key={childIndex}>
                      <button
                        className={`w-full rounded-md  flex px-4 py-2 text-left text-gray-700 ${
                          child.disabled
                            ? "text-gray-400 cursor-not-allowed"
                            : "hover:bg-gray-100 w-72 mt-2"
                        }`}
                        onClick={() => handleNavigate(child.path)}
                        disabled={child.disabled}
                      >
                        <span className="mr-3">{child.icon}</span> {child.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <UserProfile
          username={user.username}
          email={user.email}
          onLogout={handleLogout}
          onResetPassword={sendPasswordResetEmail}
        />

        {isOverlayOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-4 rounded-lg shadow-lg text-center w-64">
              <h2 className="text-[16px] font-semibold text-gray-900">
              パスワード再設定リンクを送信しました
              </h2>
              <p className="text-gray-600 text-sm mt-2">
              <strong>{user.email}</strong> に再設定用リンクを送信しました。<br />
              受信トレイをご確認ください。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
