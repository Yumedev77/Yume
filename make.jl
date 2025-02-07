using Documenter
using YUMEOS

makedocs(
    sitename = "YUMEOS",
    format = Documenter.HTML(),
    modules = [YUMEOS],
    pages = [
        "Home" => "index.md",
        "Manual" => [
            "Getting Started" => "manual/getting_started.md",
            "Authentication" => "manual/authentication.md",
            "Tweeting" => "manual/tweeting.md",
            "AI Integration" => "manual/ai_integration.md",
        ],
        "API Reference" => "api.md"
    ]
)

deploydocs(
    repo = "github.com/yourusername/YUMEOS.jl.git",
    devbranch = "main"
) 