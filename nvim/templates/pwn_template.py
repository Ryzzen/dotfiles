from pwn import *

context.terminal = ["kitty"]
context.update(arch="x86-64")
# context.log_level = "error"

exe = context.binary = ELF(args.EXE or "./NAME")
# libc = ELF("")


def start(argv=[], *a, **kw):
    if args.GDB:
        return gdb.debug([exe.path] + argv, gdbscript=gdbscript, *a, **kw)
    elif args.SSH:
        return ssh(
            user="",
            host="",
            port=0,
            password="",
        ).process("./NAME")
    elif args.REM:
        return remote(host="", port=0)
    else:
        return process([exe.path] + argv, *a, **kw)


gdbscript = """
tar ext :1234
continue
""".format(
    **locals()
)


io = start()


io.interactive()
