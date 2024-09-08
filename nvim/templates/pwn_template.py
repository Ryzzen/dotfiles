from pwn import *

context.terminal = ["kitty"]
context.update(arch="x86-64")
# context.log_level = "error"

exe = context.binary = ELF(args.EXE or "./NAME")
# libc = ELF("")


def start(argv=[], *a, **kw):
    if args.SSH:
        s = ssh(
            user="poun",
            host="127.0.0.1",
            port=2222,
            password="poun",
        )
        if args.GDB:
            return gdb.debug("NAME", ssh=s, gdbscript=gdbscript)
        else:
            return s.system("NAME")
    elif args.REM:
        return remote(host="127.0.0.1", port=8080)
    elif args.GDB:
        return gdb.debug([exe.path] + argv, gdbscript=gdbscript, *a, **kw)
    else:
        return process([exe.path] + argv, *a, **kw)


gdbscript = """
continue
""".format(
    **locals()
)


io = start()


io.interactive()
