
document.addEventListener("DOMContentLoaded", function (event)
{
	function loadFromBimserver(address, username, password, target)
	{
		target.innerHTML = "";
		var client = window.BimServerClient;
		client.init(function ()
		{
			var div = document.createElement("div");
			var h3 = document.createElement("h3");
			h3.textContent = address;
			div.appendChild(h3);
			var status = document.createElement("div");
			div.appendChild(status);
			var ul = document.createElement("ul");
			div.appendChild(ul);
			target.appendChild(div);

			status.textContent = "Logging in...";

			client.login(username, password, function ()
			{
				status.textContent = "Getting all projects...";
				client.call("ServiceInterface", "getAllProjects", {
					onlyTopLevel: true,
					onlyActive: true
				}, function (projects)
				{
					var totalFound = 0;
					projects.forEach(function (project)
					{
						if (project.lastRevisionId != -1)
						{
							var li = document.createElement("li");
							var a = document.createElement("a");
							li.appendChild(a);
							a.textContent = project.name;
							a.setAttribute("href", "docs/sigurd_BIMServer.html?address=" + encodeURIComponent(address) + "&token=" + client.token + "&poid=" + project.oid + "&roid=" + project.lastRevisionId);
							console.log(address);
							ul.appendChild(li);
							totalFound++;
						}
					});
					if (totalFound == 0)
					{
						status.textContent = "No projects with revisions found on this server";
					}
					else
					{
						status.textContent = "";
					}
				});
			}, function (error)
			{
				console.error(error);
				status.textContent = error.message;
			});
		});
	}

	var loadLink = document.getElementById("loadFromOtherBimServer");
	loadLink.onclick = function(){
		document.getElementById("other").style.display = "block";
		if (localStorage.getItem("address") != null) {
			document.getElementById("address").value = localStorage.getItem("address");
			document.getElementById("username").value = localStorage.getItem("username");
			document.getElementById("password").value = localStorage.getItem("password");
		}
		document.getElementById("address").focus();
	};

	var loadProjectsBtn = document.getElementById("loadProjectsBtn");
	loadProjectsBtn.onclick = function(){
		var address = document.getElementById("address").value;
		var username = document.getElementById("username").value;
		var password = document.getElementById("password").value;
		localStorage.setItem("address", address);
		localStorage.setItem("username", username);
		localStorage.setItem("password", password);
		try
		{
			loadFromBimserver(address, username, password, document.getElementById("otherProjects"));
		}
		catch (e)
		{
			console.log(e);
		}

	};
});