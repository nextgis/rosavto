<%page args='sub_navs'/>
<div class="col hide-on-small-only m3 l2">
    <div class="toc-wrapper">
        <div style="height: 1px;">
            <ul class="table-of-contents">
                %for (sub_nav_id, sub_nav_title) in sub_navs:
                    <li><a href="#${sub_nav_id}">${sub_nav_title}</a></li>
                %endfor
            </ul>
        </div>
    </div>
</div>