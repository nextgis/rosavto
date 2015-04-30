<%
    import pkg_resources
    js_file_name = pkg_resources.resource_filename('rosavto', 'static/js/pages/' + request.matched_route.name + '.js')

    import codecs
    f = codecs.open(js_file_name, encoding='utf-8')
##    for line in f:
##        print repr(line)
%>

%for line in f:
    ${line}
%endfor