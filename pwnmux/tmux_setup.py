# How to use:
# gef> source /path/to/tmux_setup.py

import atexit
import os

import gdb


def main():
    # reset panes
    try:
        gdb.execute("pi GefTmuxSetupCommand.reset_panes()", to_string=True)
    except gdb.error:
        print("GEF is not loaded")
        return

    # split
    """
    +--------+--------+--------+
    |        | code   | legend |
    |        | args   | regs   |
    |        | source +--------+
    |        |        | stack  |
    |        +--------+ mem_acc|
    |        | others |        |
    | cmd    |        |        |
    +--------+--------+--------+
    """
    panes = {}
    panes["code"] = (
        os.popen('tmux split-window -P -F"#{pane_tty}" -vb -l 75% -d "cat -"')
        .read()
        .strip()
    )
    panes["stack"] = (
        os.popen('tmux split-window -P -F"#{pane_tty}" -v -t {top} -l 40% -d "cat -"')
        .read()
        .strip()
    )
    panes["trace"] = (
        os.popen('tmux split-window -P -F"#{pane_tty}" -h -t 1 -l 35% -d "cat -"')
        .read()
        .strip()
    )
    panes["legend"] = (
        os.popen(
            'tmux resize-pane -t {top} -y +5 \; split-window -P -F"#{pane_tty}" -h -t {top} -l 35% -d "cat -"'
        )
        .read()
        .strip()
    )
    panes["ipython"] = (
        os.popen(
            'tmux split-window -P -F"#{pane_tty}" -h -t {bottom} -l 30% -d "python3"'
        )
        .read()
        .strip()
    )

    panes["regs"] = panes["legend"]
    panes["mem_access"] = panes["stack"]
    panes["args"] = panes["code"]
    panes["source"] = panes["code"]
    panes["threads"] = panes["trace"]
    panes["mem_watch"] = panes["trace"]
    panes["extra"] = panes["trace"]

    # set config
    for section, pane_tty in panes.items():
        if pane_tty:
            gdb.execute(
                f"gef config context_{section}.redirect {pane_tty}", to_string=True
            )

    # set more config
    gdb.execute(f"gef config context_code.nb_lines 18", to_string=True)
    # gdb.execute(f"gef config context_code.nb_lines_prev 4", to_string=True)
    gdb.execute(f"gef config context_stack.nb_lines 20", to_string=True)

    # add atexit
    gdb.execute("pi atexit.register(GefTmuxSetupCommand.reset_panes)", to_string=True)

    # clear cache
    gdb.execute("gef reset-cache", to_string=True)

    return


if __name__ == "__main__":
    main()
