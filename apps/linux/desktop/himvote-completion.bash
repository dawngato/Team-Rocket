# Bash completion for HimVote Linux Desktop Client and Verifier CLI
# FreeDesktop / GNU Linux bash-completion integration

_himvote_completion() {
    local cur prev words cword
    _init_completion || return

    local options="--api-base --verifier --archive --headless --verify-receipt --export-report --export-json --export-md --check-origins --help --version"

    case "${prev}" in
        --api-base)
            COMPREPLY=( $(compgen -W "http://localhost:8080 http://localhost:8081 http://127.0.0.1:8080 https://vote.university.edu" -- "${cur}") )
            return 0
            ;;
        --verifier)
            _filedir py
            return 0
            ;;
        --archive)
            _filedir '@(zip|tar.gz|tgz)'
            return 0
            ;;
        --export-report|--export-json|--export-md)
            _filedir '@(json|md|txt)'
            return 0
            ;;
        --verify-receipt)
            return 0
            ;;
    esac

    if [[ "${cur}" == -* ]]; then
        COMPREPLY=( $(compgen -W "${options}" -- "${cur}") )
        return 0
    fi

    _filedir
}

complete -F _himvote_completion himvote
complete -F _himvote_completion himvote_linux.py
